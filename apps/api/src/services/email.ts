/**
 * Email service — thin wrapper over the Resend REST API.
 *
 * Uses `fetch` directly so we don't add a runtime dependency. If
 * RESEND_API_KEY is not set, all sends become no-ops and log a warning,
 * which keeps local dev and CI green without a mail provider.
 */

import { logger } from '../lib/logger.js';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  id: string | null;
  skipped: boolean;
  error?: string;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    logger.warn(
      { to: input.to, subject: input.subject },
      'Email skipped — RESEND_API_KEY or EMAIL_FROM not configured',
    );
    return { id: null, skipped: true };
  }

  const body = {
    from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text ?? stripHtml(input.html),
    ...(input.replyTo ? { reply_to: input.replyTo } : {}),
  };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!res.ok) {
      const err = data.message || data.name || `HTTP ${res.status}`;
      logger.error({ err, to: input.to, subject: input.subject }, 'Email send failed');
      return { id: null, skipped: false, error: err };
    }

    logger.info(
      { id: data.id, to: input.to, subject: input.subject },
      'Email sent',
    );
    return { id: data.id ?? null, skipped: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg, to: input.to }, 'Email send threw');
    return { id: null, skipped: false, error: msg };
  }
}
