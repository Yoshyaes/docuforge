class DeckleError(Exception):
    def __init__(self, message: str, status_code: int = 0, code: str = "UNKNOWN"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


class AuthenticationError(DeckleError):
    def __init__(self, message: str = "Invalid API key"):
        super().__init__(message, status_code=401, code="UNAUTHORIZED")


class RateLimitError(DeckleError):
    def __init__(self, retry_after: int = 1, message: str = "Rate limit exceeded"):
        super().__init__(message, status_code=429, code="RATE_LIMITED")
        self.retry_after = retry_after


class ValidationError(DeckleError):
    def __init__(self, message: str):
        super().__init__(message, status_code=400, code="VALIDATION_ERROR")
