from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.schemas.common.fields import (
    field_array_objects,
    field_currency,
    field_date,
    field_number,
    field_string,
)
from app.schemas.common.snapshot import DocumentIntelligenceSnapshot
from app.schemas.receipt.models import ReceiptExtraction, ReceiptLineItem


def _merge_currency(
    current_code: str | None,
    current_amount: Decimal | None,
    field: dict[str, Any] | None,
) -> tuple[str | None, Decimal | None]:
    code, amount = field_currency(field)
    return current_code or code, current_amount if current_amount is not None else amount


def _map_line_items(fields: dict[str, Any]) -> list[ReceiptLineItem]:
    line_items: list[ReceiptLineItem] = []
    for row in field_array_objects(fields.get("Items")):
        _, price = field_currency(row.get("Price"))
        _, total_price = field_currency(row.get("TotalPrice"))
        line_items.append(
            ReceiptLineItem(
                description=field_string(row.get("Description")),
                quantity=field_number(row.get("Quantity")),
                price=price,
                total_price=total_price,
            )
        )
    return line_items


def map_receipt(snapshot: DocumentIntelligenceSnapshot) -> ReceiptExtraction:
    fields = snapshot.fields
    currency: str | None = None
    subtotal: Decimal | None = None
    total_tax: Decimal | None = None
    total: Decimal | None = None

    currency, subtotal = _merge_currency(currency, subtotal, fields.get("Subtotal"))
    currency, total_tax = _merge_currency(currency, total_tax, fields.get("TotalTax"))
    currency, total = _merge_currency(currency, total, fields.get("Total"))

    return ReceiptExtraction(
        doc_type=snapshot.doc_type,
        confidence=snapshot.confidence,
        merchant_name=field_string(fields.get("MerchantName")),
        merchant_address=field_string(fields.get("MerchantAddress")),
        country_region=field_string(fields.get("CountryRegion")),
        receipt_type=field_string(fields.get("ReceiptType")),
        transaction_date=field_date(fields.get("TransactionDate")),
        transaction_time=field_string(fields.get("TransactionTime")),
        currency=currency,
        subtotal=subtotal,
        total_tax=total_tax,
        total=total,
        line_items=_map_line_items(fields),
    )
