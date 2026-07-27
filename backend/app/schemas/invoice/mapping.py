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
from app.schemas.invoice.models import InvoiceExtraction, InvoiceLineItem


def _merge_currency(
    current_code: str | None,
    current_amount: Decimal | None,
    field: dict[str, Any] | None,
) -> tuple[str | None, Decimal | None]:
    code, amount = field_currency(field)
    return current_code or code, current_amount if current_amount is not None else amount


def _map_line_items(fields: dict[str, Any]) -> list[InvoiceLineItem]:
    line_items: list[InvoiceLineItem] = []
    for row in field_array_objects(fields.get("Items")):
        _, unit_price = field_currency(row.get("UnitPrice"))
        _, amount = field_currency(row.get("Amount"))
        line_items.append(
            InvoiceLineItem(
                description=field_string(row.get("Description")),
                quantity=field_number(row.get("Quantity")),
                unit_price=unit_price,
                amount=amount,
            )
        )
    return line_items


def map_invoice(snapshot: DocumentIntelligenceSnapshot) -> InvoiceExtraction:
    fields = snapshot.fields
    currency: str | None = None
    subtotal: Decimal | None = None
    total_tax: Decimal | None = None
    invoice_total: Decimal | None = None

    currency, subtotal = _merge_currency(currency, subtotal, fields.get("SubTotal"))
    currency, total_tax = _merge_currency(currency, total_tax, fields.get("TotalTax"))
    currency, invoice_total = _merge_currency(currency, invoice_total, fields.get("InvoiceTotal"))

    return InvoiceExtraction(
        doc_type=snapshot.doc_type,
        confidence=snapshot.confidence,
        vendor_name=field_string(fields.get("VendorName")),
        vendor_vat_id=field_string(fields.get("VendorTaxId")),
        customer_name=field_string(fields.get("CustomerName")),
        customer_vat_id=field_string(fields.get("CustomerTaxId")),
        customer_address=field_string(fields.get("CustomerAddress")),
        invoice_number=field_string(fields.get("InvoiceId")),
        invoice_date=field_date(fields.get("InvoiceDate")),
        due_date=field_date(fields.get("DueDate")),
        purchase_order=field_string(fields.get("PurchaseOrder")),
        currency=currency,
        subtotal=subtotal,
        total_tax=total_tax,
        invoice_total=invoice_total,
        line_items=_map_line_items(fields),
    )
