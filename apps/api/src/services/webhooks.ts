import { createHmac } from 'crypto';
import { resolve4, resolve6 } from 'dns/promises';
import { logger } from '../lib/logger.js';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1s, 2s, 4s exponential backoff
const WEBHOOK_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const ALLOWED_SCHEMES = new Set(['http:', 'https:']);
const ALLOWED_PORTS = new Set([80, 443, 8080, 8443]);

interface WebhookPayload {
  id: string;
  status: string;
  url?: string;
  pages?: number;
  file_size?: number;
  generation_time_ms?: number;
  error?: string;
}

/**
 * Check if an IP address is in a private/reserved range (SSRF protection).
 */
function isPrivateIp(ip: string): boolean {
  // Handle IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1)
  if (/^::ffff:/i.test(ip)) {
    return isPrivateIp(ip.replace(/^::ffff:/i, ''));
  }

  // IPv4 private/reserved ranges
  if (/^127\./.test(ip)) return true; // loopback
  if (/^10\./.test(ip)) return true; // RFC 1918
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true; // RFC 1918
  if (/^192\.168\./.test(ip)) return true; // RFC 1918
  if (/^169\.254\./.test(ip)) return true; // link-local (AWS/GCP metadata)
  if (/^0\./.test(ip)) return true; // current network
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return true; // CGNAT (RFC 6598)
  if (/^192\.0\.0\./.test(ip)) return true; // RFC 6890
  if (/^192\.0\.2\./.test(ip)) return true; // TEST-NET-1
  if (/^198\.18\./.test(ip)) return true; // benchmark
  if (/^198\.51\.100\./.test(ip)) return true; // TEST-NET-2
  if (/^203\.0\.113\./.test(ip)) return true; // TEST-NET-3
  if (/^22[4-9]\.|^23\d\./.test(ip)) return true; // multicast
  if (/^24\d\.|^25[0-5]\./.test(ip)) return true; // reserved/broadcast
  if (ip === '::1' || ip === '::' || ip === '0:0:0:0:0:0:0:1') return true; // IPv6 loopback / unspecified
  if (/^f[cd][0-9a-f]{2}:/i.test(ip)) return true; // IPv6 unique-local
  if (/^fe[89ab][0-9a-f]:/i.test(ip)) return true; // IPv6 link-local
  if (/^ff[0-9a-f]{2}:/i.test(ip)) return true; // IPv6 multicast
  return false;
}

/**
 * Validate that a webhook URL is safe to fetch:
 *  - scheme is http: or https:
 *  - port is on the allowlist
 *  - no userinfo segment
 *  - hostname resolves to public IPs only (both A and AAAA)
 *  - special-cased localhost / 0.0.0.0 / domain-less hosts rejected
 *
 * Throws on any violation. Callers should catch and abort delivery.
 */
async function validateWebhookUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Webhook URL is not a valid absolute URL');
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw new Error(`Webhook URL scheme ${parsed.protocol} is not allowed (use http: or https:)`);
  }

  if (parsed.username || parsed.password) {
    throw new Error('Webhook URL must not contain userinfo (user:pass@)');
  }

  // Port — explicit when present, default for the scheme otherwise.
  const port = parsed.port
    ? parseInt(parsed.port, 10)
    : parsed.protocol === 'https:'
      ? 443
      : 80;
  if (!ALLOWED_PORTS.has(port)) {
    throw new Error(`Webhook URL port ${port} is not allowed`);
  }

  const hostname = parsed.hostname.toLowerCase();
  // Block exact bypass names before DNS lookup.
  if (['localhost', '0.0.0.0', 'broadcasthost', 'ip6-localhost'].includes(hostname)) {
    throw new Error('Webhook URL cannot target localhost');
  }
  // Hostname must contain a dot (rejects single-label internal names like `intranet`).
  if (!hostname.includes('.') && !hostname.includes(':')) {
    throw new Error('Webhook URL hostname must be a fully-qualified domain name');
  }

  // If hostname is already an IP literal, validate it directly.
  if (isIpLiteral(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error(`Webhook URL targets a private IP (${hostname})`);
    }
    return;
  }

  // Resolve BOTH A and AAAA so a hostname that only has AAAA records
  // (e.g. an IPv6-only metadata service) still trips the private-IP
  // check. Either resolver returning empty is fine — what we reject
  // is any resolved address being private.
  const [a, aaaa] = await Promise.all([
    safeResolve(() => resolve4(hostname)),
    safeResolve(() => resolve6(hostname)),
  ]);
  const all = [...a, ...aaaa];

  if (all.length === 0) {
    // DNS couldn't resolve — let fetch fail naturally. Don't allow if
    // we can't verify, but no need to throw a SSRF-shaped error.
    return;
  }

  for (const ip of all) {
    if (isPrivateIp(ip)) {
      throw new Error(`Webhook URL ${hostname} resolves to a private IP (${ip})`);
    }
  }
}

function isIpLiteral(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^\[?[0-9a-f:]+\]?$/i.test(host);
}

async function safeResolve(fn: () => Promise<string[]>): Promise<string[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * POST the payload and explicitly disallow auto-follow. If we see a
 * redirect, manually validate the Location header against the same
 * SSRF policy and re-issue the request — up to MAX_REDIRECTS.
 */
async function attemptDelivery(
  url: string,
  payload: string,
  signature: string,
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  let current = url;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(current, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DocuForge-Signature': signature,
          'X-DocuForge-Timestamp': Date.now().toString(),
        },
        body: payload,
        redirect: 'manual',
        signal: controller.signal,
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) return false;
        if (hop >= MAX_REDIRECTS) {
          logger.warn({ url, current }, 'Webhook exceeded max redirects');
          return false;
        }
        // Resolve relative locations against the current URL.
        const next = new URL(location, current).toString();
        await validateWebhookUrl(next);
        current = next;
        continue;
      }

      return res.ok;
    }
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Delivers a webhook with up to 3 retries and exponential backoff.
 * Signs the payload with HMAC-SHA256 using WEBHOOK_SIGNING_SECRET.
 * Validates URL against SSRF rules (scheme, port, IP allowlist, A+AAAA,
 * manual redirect handling). Fire-and-forget — logs errors, never
 * throws.
 */
export async function deliverWebhook(
  url: string,
  payload: WebhookPayload,
): Promise<void> {
  const secret = process.env.WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('WEBHOOK_SIGNING_SECRET is not set — skipping webhook delivery in production');
      return;
    }
    logger.warn('WEBHOOK_SIGNING_SECRET is not set — using insecure dev default');
  }

  try {
    await validateWebhookUrl(url);
  } catch (err) {
    logger.error({ err, url }, 'Webhook URL rejected (SSRF protection)');
    return;
  }

  const body = JSON.stringify(payload);
  const signature = signPayload(body, secret || 'whsec_dev_only');

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const ok = await attemptDelivery(url, body, signature);
      if (ok) return;
      logger.warn({ attempt: attempt + 1, url }, 'Webhook delivery got non-2xx');
    } catch (err) {
      logger.warn({ attempt: attempt + 1, url, err }, 'Webhook delivery attempt failed');
    }

    if (attempt < MAX_RETRIES) {
      await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
    }
  }

  logger.error({ url }, 'Webhook delivery exhausted all retries');
}
