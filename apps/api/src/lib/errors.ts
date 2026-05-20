import { ZodError } from 'zod';
import { randomUUID } from 'crypto';
import { logger } from './logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthError extends AppError {
  constructor(
    message = "Invalid API key. Send it as 'Authorization: Bearer df_live_…' (must start with df_live_).",
  ) {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class RateLimitError extends AppError {
  constructor(public retryAfter: number) {
    super(
      429,
      'RATE_LIMITED',
      `Rate limit exceeded. Retry after ${retryAfter}s, or upgrade your plan for higher limits.`,
    );
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, hint?: string) {
    const base = `${resource} not found`;
    super(404, 'NOT_FOUND', hint ? `${base}. ${hint}` : base);
  }
}

export class UsageLimitError extends AppError {
  constructor() {
    super(
      403,
      'USAGE_LIMIT_EXCEEDED',
      'Monthly usage limit reached. Upgrade to Starter or Pro for higher limits.',
    );
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, 'VALIDATION_ERROR', message);
  }
}

/**
 * Translate a ZodError into a structured per-field error response. The
 * previous behavior was a comma-joined string which made it hard for
 * SDKs to render field-level UI. The new shape:
 *
 *   {
 *     error: {
 *       code: 'VALIDATION_ERROR',
 *       message: 'first issue (summary)',
 *       fields: [
 *         { field: 'html', message: 'must be at most 5MB' },
 *         { field: 'options.format', message: 'expected one of …' },
 *       ],
 *     }
 *   }
 */
function buildFieldErrors(err: ZodError) {
  return err.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : '<root>',
    message: issue.message,
  }));
}

/**
 * Build the JSON error response for a thrown error.
 *
 * Pass the request's correlation id (set by the logging middleware
 * via c.set('requestId', ...)) so it gets baked into every response
 * — customers can share that id with support to look up the
 * corresponding server log line.
 */
export function errorResponse(err: unknown, requestId?: string) {
  if (err instanceof AppError) {
    return {
      status: err.statusCode,
      body: {
        error: {
          code: err.code,
          message: err.message,
          ...(err instanceof RateLimitError ? { retry_after: err.retryAfter } : {}),
          ...(requestId ? { request_id: requestId } : {}),
        },
      },
    };
  }

  if (err instanceof ZodError) {
    const fields = buildFieldErrors(err);
    return {
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message:
            fields.length === 1
              ? fields[0].message
              : `Validation failed: ${fields.length} fields are invalid`,
          fields,
          ...(requestId ? { request_id: requestId } : {}),
        },
      },
    };
  }

  // Unexpected error. Prefer the caller's request id; mint a fresh
  // one if missing so we always log+return a correlatable id.
  const id = requestId ?? randomUUID();
  logger.error({ err, requestId: id }, 'Unexpected error');
  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message:
          'Something broke on our side. Retry in a minute. If this persists, share the request_id below with support@getdocuforge.dev.',
        request_id: id,
      },
    },
  };
}
