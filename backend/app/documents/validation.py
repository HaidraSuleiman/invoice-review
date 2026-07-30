"""Pure finance checks on normalized extractions (no provider or HTTP types)."""

from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field
from stdnum.eu import vat as eu_vat
from stdnum.exceptions import ValidationError

from app.schemas.invoice.models import InvoiceExtraction
from app.schemas.receipt.models import ReceiptExtraction

FinancialExtraction = InvoiceExtraction | ReceiptExtraction

TOTAL_TOLERANCE = Decimal("0.01")
VatField = Literal["vendor_vat_id", "customer_vat_id"]


class VatFormatCheck(BaseModel):
    field: VatField
    present: bool = False
    raw_value: str | None = None
    compact_value: str | None = None
    valid: bool | None = None
    message: str | None = None


class TotalsReconciliation(BaseModel):
    subtotal: Decimal | None = None
    total_tax: Decimal | None = None
    total: Decimal | None = None
    expected_total: Decimal | None = None
    delta: Decimal | None = None
    reconciles: bool | None = None


class ExtractionValidation(BaseModel):
    document_type: Literal["invoice", "receipt"]
    vat_checks: list[VatFormatCheck] = Field(default_factory=list)
    totals: TotalsReconciliation
    issues: list[str] = Field(default_factory=list)


def validate_eu_vat_format(field: VatField, raw_value: str | None) -> VatFormatCheck:
    if raw_value is None or not raw_value.strip():
        return VatFormatCheck(field=field, present=False, raw_value=raw_value, valid=None)

    trimmed = raw_value.strip()
    try:
        compact = eu_vat.compact(trimmed)
        validated = eu_vat.validate(trimmed)
        return VatFormatCheck(
            field=field,
            present=True,
            raw_value=trimmed,
            compact_value=validated or compact,
            valid=True,
        )
    except ValidationError as exc:
        return VatFormatCheck(
            field=field,
            present=True,
            raw_value=trimmed,
            valid=False,
            message=str(exc),
        )


def reconcile_totals(
    *,
    subtotal: Decimal | None,
    total_tax: Decimal | None,
    total: Decimal | None,
) -> TotalsReconciliation:
    if subtotal is None or total_tax is None or total is None:
        return TotalsReconciliation(
            subtotal=subtotal,
            total_tax=total_tax,
            total=total,
            reconciles=None,
        )

    expected_total = subtotal + total_tax
    delta = abs(total - expected_total)
    return TotalsReconciliation(
        subtotal=subtotal,
        total_tax=total_tax,
        total=total,
        expected_total=expected_total,
        delta=delta,
        reconciles=delta <= TOTAL_TOLERANCE,
    )


def validate_invoice_extraction(extraction: InvoiceExtraction) -> ExtractionValidation:
    vat_checks = [
        validate_eu_vat_format("vendor_vat_id", extraction.vendor_vat_id),
        validate_eu_vat_format("customer_vat_id", extraction.customer_vat_id),
    ]
    totals = reconcile_totals(
        subtotal=extraction.subtotal,
        total_tax=extraction.total_tax,
        total=extraction.invoice_total,
    )
    issues = _collect_vat_issues(vat_checks) + _collect_total_issues(totals)
    return ExtractionValidation(
        document_type="invoice",
        vat_checks=vat_checks,
        totals=totals,
        issues=issues,
    )


def validate_receipt_extraction(extraction: ReceiptExtraction) -> ExtractionValidation:
    totals = reconcile_totals(
        subtotal=extraction.subtotal,
        total_tax=extraction.total_tax,
        total=extraction.total,
    )
    issues = _collect_total_issues(totals)
    return ExtractionValidation(
        document_type="receipt",
        vat_checks=[],
        totals=totals,
        issues=issues,
    )


def validate_financial_extraction(extraction: FinancialExtraction) -> ExtractionValidation:
    if extraction.document_type == "invoice":
        return validate_invoice_extraction(extraction)
    return validate_receipt_extraction(extraction)


def _collect_vat_issues(checks: list[VatFormatCheck]) -> list[str]:
    issues: list[str] = []
    for check in checks:
        label = check.field.replace("_", " ")
        if not check.present:
            issues.append(f"{label}: missing")
            continue
        if check.valid is False:
            detail = check.message or "invalid EU VAT format"
            issues.append(f"{label}: {detail}")
    return issues


def _collect_total_issues(totals: TotalsReconciliation) -> list[str]:
    if totals.reconciles is False:
        delta = totals.delta.quantize(TOTAL_TOLERANCE) if totals.delta is not None else None
        return [f"subtotal, VAT, and total do not reconcile (delta {delta})"]
    return []
