"""HTTP/Pydantic schemas for review history."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

ReviewStatus = Literal["accepted", "rejected"]
DocumentType = Literal["invoice", "receipt"]


class ReviewCreate(BaseModel):
    status: ReviewStatus
    original_filename: str = Field(min_length=1, max_length=512)
    stored_filename: str = Field(min_length=1, max_length=128)
    document_type: DocumentType
    party_name: str = ""
    party_vat_id: str = ""
    counterparty_name: str = ""
    counterparty_vat_id: str = ""
    document_number: str = ""
    document_date: date | None = None
    due_date: date | None = None
    purchase_order: str = ""
    currency: str = ""
    subtotal: Decimal | None = None
    total_tax: Decimal | None = None
    total: Decimal | None = None
    gl_account_code: str = ""
    notes: str = ""


class ReviewRecord(BaseModel):
    id: str
    status: ReviewStatus
    document_type: DocumentType
    original_filename: str
    stored_filename: str
    decided_at: datetime
    party_name: str
    party_vat_id: str | None
    counterparty_name: str | None
    counterparty_vat_id: str | None
    document_number: str | None
    document_date: date | None
    due_date: date | None
    purchase_order: str | None
    currency: str | None
    subtotal: Decimal | None
    total_tax: Decimal | None
    total: Decimal | None
    gl_account_code: str | None
    notes: str | None


class ReviewSummary(BaseModel):
    id: str
    status: ReviewStatus
    document_type: DocumentType
    original_filename: str
    party_name: str
    document_number: str | None
    currency: str | None
    total: Decimal | None
    gl_account_code: str | None
    decided_at: datetime
