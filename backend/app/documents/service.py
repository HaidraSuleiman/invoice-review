"""Orchestrate upload processing without HTTP or persistence concerns."""

from __future__ import annotations

import uuid
from pathlib import Path

from app.config import (
    ALLOWED_UPLOAD_SUFFIXES,
    MAX_UPLOAD_BYTES,
    UPLOAD_DIR,
    Settings,
)
from app.documents.schemas import ProcessDocumentResponse
from app.pipeline.run import run_document_pipeline


class UploadValidationError(ValueError):
    """Raised when an upload fails size or type checks."""


def process_document(
    settings: Settings,
    *,
    filename: str,
    content: bytes,
) -> ProcessDocumentResponse:
    """Validate bytes, store under a UUID path, then run the extraction pipeline."""
    stored_path = _store_upload(filename=filename, content=content)
    pipeline_result = run_document_pipeline(settings, stored_path)
    return ProcessDocumentResponse(
        original_filename=Path(filename).name or "upload",
        stored_filename=stored_path.name,
        result=pipeline_result,
    )


def _store_upload(*, filename: str, content: bytes) -> Path:
    if len(content) == 0:
        raise UploadValidationError("Uploaded file is empty")
    if len(content) > MAX_UPLOAD_BYTES:
        raise UploadValidationError(
            f"Uploaded file exceeds the {MAX_UPLOAD_BYTES} byte limit"
        )

    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_UPLOAD_SUFFIXES:
        raise UploadValidationError(
            f"Unsupported file type {suffix!r}; allowed: "
            f"{', '.join(sorted(ALLOWED_UPLOAD_SUFFIXES))}"
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_path = UPLOAD_DIR / f"{uuid.uuid4().hex}{suffix}"
    stored_path.write_bytes(content)
    return stored_path
