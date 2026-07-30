"""Accumulated artifacts from the document extraction pipeline."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.accounting.gl_suggestion import GlSuggestion
from app.documents.validation import ExtractionValidation
from app.pipeline.classification import DocumentClassification
from app.schemas.common.snapshot import DocumentIntelligenceSnapshot
from app.schemas.invoice.models import InvoiceExtraction
from app.schemas.receipt.models import ReceiptExtraction

FinancialExtraction = InvoiceExtraction | ReceiptExtraction


class DocumentPipelineState(BaseModel):
    classification: DocumentClassification | None = None
    snapshot: DocumentIntelligenceSnapshot | None = None
    extraction: FinancialExtraction | None = None
    validation: ExtractionValidation | None = None
    gl_suggestion: GlSuggestion | None = None


class DocumentPipelineResult(BaseModel):
    """Final pipeline output for downstream review and policy."""

    classification: DocumentClassification
    snapshot: DocumentIntelligenceSnapshot
    extraction: FinancialExtraction
    validation: ExtractionValidation
    gl_suggestion: GlSuggestion
    line_item_count: int = Field(ge=0)
