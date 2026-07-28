"""LLM document classification (invoice vs receipt) before Document Intelligence."""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field
from pydantic_ai import Agent, BinaryContent
from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.providers.openai import OpenAIProvider

from app.config import Settings
from app.providers.azure_openai import DEPLOYMENT_NAME, azure_openai_base_url

CLASSIFY_INSTRUCTIONS = (
    "Classify the attached financial document. "
    "Use invoice for supplier invoices and bills. "
    "Use receipt for paid expense receipts such as fuel, retail, or card slips."
)

_MEDIA_TYPES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}


class DocumentClassification(BaseModel):
    document_type: Literal["invoice", "receipt"]
    confidence: float = Field(ge=0.0, le=1.0)


def _media_type(path: Path) -> str:
    media_type = _MEDIA_TYPES.get(path.suffix.lower())
    if media_type is None:
        raise ValueError(f"Unsupported document type: {path.suffix!r}")
    return media_type


def classification_agent(settings: Settings) -> Agent[None, DocumentClassification]:
    model = OpenAIResponsesModel(
        DEPLOYMENT_NAME,
        provider=OpenAIProvider(
            base_url=azure_openai_base_url(settings),
            api_key=settings.azure_openai_api_key,
        ),
    )
    return Agent(
        model,
        output_type=DocumentClassification,
        instructions=CLASSIFY_INSTRUCTIONS,
    )


def classify_document(settings: Settings, document_path: Path) -> DocumentClassification:
    agent = classification_agent(settings)
    content = BinaryContent(
        data=document_path.read_bytes(),
        media_type=_media_type(document_path),
    )
    result = agent.run_sync(["Classify this document.", content])
    return result.output
