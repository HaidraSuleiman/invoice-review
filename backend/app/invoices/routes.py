"""HTTP boundary for document processing."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.config import Settings
from app.invoices.service import UploadValidationError, process_document
from app.pipeline.state import DocumentPipelineResult

router = APIRouter(tags=["documents"])


def get_settings() -> Settings:
    return Settings()


@router.post(
    "/documents/process",
    response_model=DocumentPipelineResult,
    status_code=status.HTTP_200_OK,
)
def process_uploaded_document(
    file: Annotated[UploadFile, File(description="PDF, PNG, or JPEG financial document")],
    settings: Annotated[Settings, Depends(get_settings)],
) -> DocumentPipelineResult:
    filename = file.filename or "upload"
    content = file.file.read()
    try:
        return process_document(settings, filename=filename, content=content)
    except UploadValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
