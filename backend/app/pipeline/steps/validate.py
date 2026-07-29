from __future__ import annotations

from app.invoices.validation import validate_financial_extraction
from app.pipeline.chain import PipelineContext
from app.pipeline.state import DocumentPipelineState


def validate_extraction_step(
    _ctx: PipelineContext, state: DocumentPipelineState
) -> DocumentPipelineState:
    if state.extraction is None:
        raise ValueError("validate_extraction_step requires extraction")

    validation = validate_financial_extraction(state.extraction)
    return state.model_copy(update={"validation": validation})
