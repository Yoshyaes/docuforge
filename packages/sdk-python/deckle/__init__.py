from deckle.client import Deckle
from deckle.types import (
    PDFOptions,
    GenerateParams,
    GenerateResponse,
    Generation,
    TemplateParams,
    ReactParams,
    BatchItem,
    BatchResponse,
    ListResponse,
    Template,
    CreateTemplateParams,
    UsageStats,
)
from deckle.errors import (
    DeckleError,
    AuthenticationError,
    RateLimitError,
    ValidationError,
)

__all__ = [
    "Deckle",
    "PDFOptions",
    "GenerateParams",
    "GenerateResponse",
    "Generation",
    "TemplateParams",
    "ReactParams",
    "BatchItem",
    "BatchResponse",
    "ListResponse",
    "Template",
    "CreateTemplateParams",
    "UsageStats",
    "DeckleError",
    "AuthenticationError",
    "RateLimitError",
    "ValidationError",
]

__version__ = "0.1.0"
