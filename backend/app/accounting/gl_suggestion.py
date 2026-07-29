"""Azure OpenAI structured GL suggestion from normalized extraction fields only."""

from __future__ import annotations

import json
from typing import Literal

from pydantic import BaseModel, Field, field_validator
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.providers.openai import OpenAIProvider

from app.accounting.catalog import GL_ACCOUNT_BY_CODE, format_catalog_for_prompt
from app.accounting.validation import validate_gl_account_code
from app.config import Settings
from app.providers.azure_openai import DEPLOYMENT_NAME, azure_openai_base_url
from app.schemas.invoice.models import InvoiceExtraction
from app.schemas.receipt.models import ReceiptExtraction

FinancialExtraction = InvoiceExtraction | ReceiptExtraction

GL_SUGGEST_INSTRUCTIONS = (
    "You suggest a Northstar general-ledger account for bookkeeping. "
    "Use only the provided catalog codes. "
    "Base the choice on supplier or merchant, line descriptions, totals, and document type. "
    "Return one code, a calibrated confidence between 0 and 1, and a brief rationale."
)


class GlModelSuggestion(BaseModel):
    account_code: str = Field(description="One code from the Northstar GL catalog.")
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str = Field(max_length=500)

    @field_validator("account_code")
    @classmethod
    def code_must_be_in_catalog(cls, value: str) -> str:
        validate_gl_account_code(value)
        return value.strip()


class GlSuggestion(BaseModel):
    """Validated GL suggestion enriched with catalog metadata."""

    account_code: str
    account_name: str
    account_description: str
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str
    document_type: Literal["invoice", "receipt"]
    deployment: str = DEPLOYMENT_NAME


def _gl_suggestion_agent(settings: Settings) -> Agent[None, GlModelSuggestion]:
    model = OpenAIResponsesModel(
        DEPLOYMENT_NAME,
        provider=OpenAIProvider(
            base_url=azure_openai_base_url(settings),
            api_key=settings.azure_openai_api_key,
        ),
    )
    return Agent(
        model,
        output_type=GlModelSuggestion,
        instructions=GL_SUGGEST_INSTRUCTIONS,
    )


def suggest_gl_account(
    settings: Settings,
    extraction: FinancialExtraction,
    *,
    document_type: Literal["invoice", "receipt"],
) -> GlSuggestion:
    agent = _gl_suggestion_agent(settings)
    catalog = format_catalog_for_prompt()
    fields_json = json.dumps(extraction.model_dump(mode="json"), indent=2)
    prompt = (
        f"{catalog}\n\n"
        f"Document type: {document_type}\n\n"
        f"Normalized extraction fields:\n{fields_json}\n\n"
        "Suggest the best matching GL account."
    )
    result = agent.run_sync(prompt)
    model_output = result.output
    account = GL_ACCOUNT_BY_CODE[model_output.account_code]
    return GlSuggestion(
        account_code=account.code,
        account_name=account.name,
        account_description=account.description,
        confidence=model_output.confidence,
        rationale=model_output.rationale,
        document_type=document_type,
    )
