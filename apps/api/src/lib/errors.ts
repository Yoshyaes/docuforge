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

export function errorResponse(err: unknown) {
  if (err instanceof AppError) {
    return {
      status: err.statusCode,
      body: {
        error: {
          code: err.code,
          message: err.message,
          ...(err instanceof RateLimitError ? { retry_after: err.retryAfter } : {}),
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
        },
      },
    };
  }

  // Unexpected error: log with a fresh request_id so support can
  // correlate the user's report to our log line.
  const requestId = randomUUID();
  logger.error({ err, requestId }, 'Unexpected error');
  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message:
          'Something broke on our side. Retry in a minute. If this persists, share the request_id below with support@getdocuforge.dev.',
        request_id: requestId,
      },
    },
  };
}
