from __future__ import annotations

from app.pipeline.chain import PipelineContext
from app.pipeline.state import DocumentPipelineState
from app.providers.azure_document_intelligence import (
    PREBUILT_INVOICE_MODEL,
    PREBUILT_RECEIPT_MODEL,
    analyze_document,
    create_document_intelligence_client,
    to_document_snapshot,
)
from app.schemas.invoice.mapping import map_invoice
from app.schemas.receipt.mapping import map_receipt


def document_intelligence_step(
    ctx: PipelineContext, state: DocumentPipelineState
) -> DocumentPipelineState:
    if state.classification is None:
        raise ValueError("document_intelligence_step requires classification")

    model_id = (
        PREBUILT_INVOICE_MODEL
        if state.classification.document_type == "invoice"
        else PREBUILT_RECEIPT_MODEL
    )
    client = create_document_intelligence_client(ctx.settings)
    result = analyze_document(client, model_id, ctx.document_path)
    snapshot = to_document_snapshot(result, model_id=model_id)
    return state.model_copy(update={"snapshot": snapshot})


def normalize_extraction_step(
    _ctx: PipelineContext, state: DocumentPipelineState
) -> DocumentPipelineState:
    if state.classification is None or state.snapshot is None:
        raise ValueError("normalize_extraction_step requires classification and snapshot")

    if state.classification.document_type == "invoice":
        extraction = map_invoice(state.snapshot)
    else:
        extraction = map_receipt(state.snapshot)
    return state.model_copy(update={"extraction": extraction})
