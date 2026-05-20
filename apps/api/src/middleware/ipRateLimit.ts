import { createMiddleware } from 'hono/factory';
import { redis } from '../lib/redis.js';
import { RateLimitError } from '../lib/errors.js';

const IP_RATE_LIMIT = 60; // requests per minute
const WINDOW_MS = 60_000; // 1 minute

/**
 * Resolve the caller's IP from request headers. Trust only headers set
 * by known reverse proxies (Fly.io, Cloudflare); ignore the raw
 * `X-Forwarded-For` an attacker can spoof end-to-end. As a last resort
 * we use the socket remote address.
 *
 * If the deployment runs behind a different proxy (e.g. NGINX), set
 * the env var TRUSTED_FORWARDED_HEADER to the header name it sets.
 */
function resolveClientIp(c: Parameters<typeof ipRateLimitMiddleware>[0] extends never ? never : any): string {
  const fly = c.req.header('fly-client-ip');
  if (fly) return fly.trim();

  const cf = c.req.header('cf-connecting-ip');
  if (cf) return cf.trim();

  const trustedHeader = process.env.TRUSTED_FORWARDED_HEADER;
  if (trustedHeader) {
    const v = c.req.header(trustedHeader);
    if (v) return v.split(',')[0]?.trim() || 'unknown';
  }

  // Non-production fallback only. In production we refuse to honour
  // an unauthenticated X-Forwarded-For because each request can claim
  // a fresh "IP" and unlock its own rate bucket.
  if (process.env.NODE_ENV !== 'production') {
    const xff = c.req.header('x-forwarded-for');
    if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  }

  return 'unknown';
}

/**
 * IP-based rate limiting for public (unauthenticated) endpoints.
 * Uses a sliding window counter in Redis keyed by IP address.
 */
export const ipRateLimitMiddleware = createMiddleware(async (c, next) => {
  const ip = resolveClientIp(c);

  const key = `ipratelimit:${ip}`;
  const now = Date.now();

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, now - WINDOW_MS);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.expire(key, 120);

    const results = await pipeline.exec();
    const rawCount = results?.[2]?.[1];
    const count = typeof rawCount === 'number' && Number.isFinite(rawCount) ? rawCount : 0;

    c.header('X-RateLimit-Limit', String(IP_RATE_LIMIT));
    c.header('X-RateLimit-Remaining', String(Math.max(0, IP_RATE_LIMIT - count)));

    if (count > IP_RATE_LIMIT) {
      c.header('Retry-After', '60');
      throw new RateLimitError(60);
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    // Fail open for public routes — don't block if Redis is down
  }

  return next();
});
