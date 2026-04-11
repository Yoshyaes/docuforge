/**
 * Records 4xx/5xx responses on /v1/* paths so the admin dashboard can
 * see what's killing first-time user activation.
 *
 * Fire-and-forget: never throws, never blocks the request path. The
 * caller (app.onError) is already in an error state — we must not make
 * it worse.
 */
import { db } from '../lib/db.js';
import { apiErrors } from '../schema/db.js';
import { logger } from './../lib/logger.js';

export interface RecordApiErrorInput {
  userId?: string | null;
  apiKeyPrefix?: string | null;
  method: string;
  path: string;
  errorCode: string;
  errorMessage: string;
  statusCode: number;
}

const MAX_PATH_LEN = 255;
const MAX_MESSAGE_LEN = 2000;

export function recordApiError(input: RecordApiErrorInput): void {
  // Only record errors on versioned API paths — no noise from marketing,
  // static assets, webhooks, health checks, etc.
  if (!input.path.startsWith('/v1/')) return;

  const path = input.path.slice(0, MAX_PATH_LEN);
  const errorMessage = input.errorMessage.slice(0, MAX_MESSAGE_LEN);

  // Fire-and-forget insert. We deliberately discard the promise and swallow
  // errors so a failing error-logger never breaks a request.
  void db
    .insert(apiErrors)
    .values({
      userId: input.userId ?? null,
      apiKeyPrefix: input.apiKeyPrefix ?? null,
      method: input.method.slice(0, 10),
      path,
      errorCode: input.errorCode.slice(0, 64),
      errorMessage,
      statusCode: input.statusCode,
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err: msg, path, code: input.errorCode }, 'Failed to record api error');
    });
}
