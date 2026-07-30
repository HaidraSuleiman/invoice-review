"""HTTP response models for document processing."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.pipeline.state import DocumentPipelineResult


class ProcessDocumentResponse(BaseModel):
    """Pipeline result plus the upload identity needed to save a review later."""

    original_filename: str = Field(min_length=1)
    stored_filename: str = Field(min_length=1)
    result: DocumentPipelineResult
