from __future__ import annotations

from app.accounting.gl_suggestion import suggest_gl_account
from app.pipeline.chain import PipelineContext
from app.pipeline.state import DocumentPipelineState


def suggest_gl_step(ctx: PipelineContext, state: DocumentPipelineState) -> DocumentPipelineState:
    if state.classification is None or state.extraction is None:
        raise ValueError("suggest_gl_step requires classification and extraction")

    document_type = state.classification.document_type
    if document_type not in ("invoice", "receipt"):
        return state

    suggestion = suggest_gl_account(
        ctx.settings,
        state.extraction,
        document_type=document_type,
    )
    return state.model_copy(update={"gl_suggestion": suggestion})
