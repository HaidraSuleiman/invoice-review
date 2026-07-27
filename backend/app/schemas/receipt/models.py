from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class ReceiptLineItem(BaseModel):
    description: str | None = None
    quantity: Decimal | None = None
    price: Decimal | None = None
    total_price: Decimal | None = None


class ReceiptExtraction(BaseModel):
    document_type: Literal["receipt"] = "receipt"
    doc_type: str | None = None
    confidence: float | None = None
    merchant_name: str | None = None
    merchant_address: str | None = None
    country_region: str | None = None
    receipt_type: str | None = None
    transaction_date: date | None = None
    transaction_time: str | None = None
    currency: str | None = None
    subtotal: Decimal | None = None
    total_tax: Decimal | None = None
    total: Decimal | None = None
    line_items: list[ReceiptLineItem] = Field(default_factory=list)
