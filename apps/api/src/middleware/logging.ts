import { createMiddleware } from 'hono/factory';
import { logger } from '../lib/logger.js';
import { randomUUID } from 'crypto';

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
  }
}

/**
 * Per-request correlation ID. Generated fresh per request (or accepted
 * from an incoming X-Request-Id if the upstream proxy already set
 * one). Exposed on the request context so route handlers can attach
 * it to log lines, and echoed back on the response so customers can
 * share it with support to look up the corresponding server log.
 */
export const loggingMiddleware = createMiddleware(async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  // Accept an upstream-provided id (e.g. from Fly/Cloudflare) if
  // present, otherwise mint a fresh one. UUID is 36 chars — keep
  // anything <= 64 chars to avoid header-bloat games.
  const inbound = c.req.header('x-request-id');
  const requestId =
    inbound && inbound.length > 0 && inbound.length <= 64 ? inbound : randomUUID();

  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  logger.info(
    { method, path, status, duration, requestId },
    `${method} ${path} ${status} ${duration}ms`,
  );
});
