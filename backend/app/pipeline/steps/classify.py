from __future__ import annotations

from app.pipeline.chain import PipelineContext
from app.pipeline.classification import classify_document
from app.pipeline.state import DocumentPipelineState


def classify_step(_ctx: PipelineContext, state: DocumentPipelineState) -> DocumentPipelineState:
    classification = classify_document(_ctx.settings, _ctx.document_path)
    return state.model_copy(update={"classification": classification})
