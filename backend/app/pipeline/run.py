"""End-to-end classify → extract → normalize → validate → GL suggestion pipeline."""

from __future__ import annotations

from pathlib import Path

from app.config import Settings
from app.pipeline.chain import Pipeline, PipelineContext
from app.pipeline.state import DocumentPipelineResult, DocumentPipelineState
from app.pipeline.steps import (
    classify_step,
    document_intelligence_step,
    normalize_extraction_step,
    suggest_gl_step,
    validate_extraction_step,
)


def run_document_pipeline(settings: Settings, document_path: Path) -> DocumentPipelineResult:
    ctx = PipelineContext(settings=settings, document_path=document_path)
    final = (
        Pipeline.start(ctx)
        .then(classify_step)
        .then(document_intelligence_step)
        .then(normalize_extraction_step)
        .then(validate_extraction_step)
        .then(suggest_gl_step)
        .run(DocumentPipelineState())
    )
    return _to_result(final)


def _to_result(state: DocumentPipelineState) -> DocumentPipelineResult:
    if (
        state.classification is None
        or state.snapshot is None
        or state.extraction is None
        or state.validation is None
        or state.gl_suggestion is None
    ):
        raise ValueError("pipeline finished with incomplete state")

    return DocumentPipelineResult(
        classification=state.classification,
        snapshot=state.snapshot,
        extraction=state.extraction,
        validation=state.validation,
        gl_suggestion=state.gl_suggestion,
        line_item_count=len(state.extraction.line_items),
    )
