export class DeckleError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message);
    this.name = 'DeckleError';
  }
}

export class AuthenticationError extends DeckleError {
  constructor(message = 'Invalid API key') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class RateLimitError extends DeckleError {
  constructor(
    public retryAfter: number,
    message = 'Rate limit exceeded',
  ) {
    super(message, 429, 'RATE_LIMITED');
  }
}

export class ValidationError extends DeckleError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}
