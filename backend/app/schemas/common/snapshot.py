from typing import Any

from pydantic import BaseModel, Field


class DocumentIntelligenceSnapshot(BaseModel):
    """Provider-neutral first document from a Document Intelligence analyze result."""

    model_id: str
    doc_type: str | None = None
    confidence: float | None = None
    fields: dict[str, Any] = Field(default_factory=dict)
