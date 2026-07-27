from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class InvoiceLineItem(BaseModel):
    description: str | None = None
    quantity: Decimal | None = None
    unit_price: Decimal | None = None
    amount: Decimal | None = None


class InvoiceExtraction(BaseModel):
    document_type: Literal["invoice"] = "invoice"
    doc_type: str | None = None
    confidence: float | None = None
    vendor_name: str | None = None
    vendor_vat_id: str | None = None
    customer_name: str | None = None
    customer_vat_id: str | None = None
    customer_address: str | None = None
    invoice_number: str | None = None
    invoice_date: date | None = None
    due_date: date | None = None
    purchase_order: str | None = None
    currency: str | None = None
    subtotal: Decimal | None = None
    total_tax: Decimal | None = None
    invoice_total: Decimal | None = None
    line_items: list[InvoiceLineItem] = Field(default_factory=list)
