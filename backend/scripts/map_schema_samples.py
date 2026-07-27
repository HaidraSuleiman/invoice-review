"""Map Document Intelligence output to Pydantic schemas and compare with samples/manifest.json."""

from __future__ import annotations

import json
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any

from app.config import Settings
from app.providers.azure_document_intelligence import (
    PREBUILT_INVOICE_MODEL,
    PREBUILT_RECEIPT_MODEL,
    analyze_document,
    create_document_intelligence_client,
    to_document_snapshot,
)
from app.schemas.invoice.mapping import map_invoice
from app.schemas.receipt.mapping import map_receipt

REPO_ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = REPO_ROOT / "samples" / "manifest.json"
SAMPLES_DIR = REPO_ROOT / "samples" / "generated"

DEFAULT_FILENAMES = (
    "01-en-happy-classic.pdf",
    "02-nl-happy-compact.pdf",
    "13-nl-fuel-receipt.png",
)


def _money(value: Decimal | None) -> str | None:
    if value is None:
        return None
    return format(value.quantize(Decimal("0.01")), "f")


def _iso(value: date | None) -> str | None:
    return value.isoformat() if value else None


def invoice_to_manifest_shape(extraction: Any) -> dict[str, str | None]:
    return {
        "document_type": "invoice",
        "vendor_name": extraction.vendor_name,
        "vendor_vat_id": extraction.vendor_vat_id,
        "customer_name": extraction.customer_name,
        "customer_vat_id": extraction.customer_vat_id,
        "invoice_number": extraction.invoice_number,
        "invoice_date": _iso(extraction.invoice_date),
        "due_date": _iso(extraction.due_date),
        "purchase_order": extraction.purchase_order,
        "currency": extraction.currency,
        "subtotal": _money(extraction.subtotal),
        "total_tax": _money(extraction.total_tax),
        "invoice_total": _money(extraction.invoice_total),
    }


def receipt_to_manifest_shape(extraction: Any) -> dict[str, str | None]:
    return {
        "document_type": "receipt",
        "vendor_name": extraction.merchant_name,
        "vendor_vat_id": None,
        "customer_name": None,
        "customer_vat_id": None,
        "invoice_number": None,
        "invoice_date": _iso(extraction.transaction_date),
        "due_date": None,
        "purchase_order": None,
        "currency": extraction.currency,
        "subtotal": _money(extraction.subtotal),
        "total_tax": _money(extraction.total_tax),
        "invoice_total": _money(extraction.total),
    }


def _normalize_compare(value: str | None) -> str | None:
    if value is None:
        return None
    return value.casefold()


def compare_to_expected(mapped: dict[str, str | None], expected: dict[str, Any]) -> list[str]:
    mismatches: list[str] = []
    keys = (
        "vendor_name",
        "vendor_vat_id",
        "customer_name",
        "customer_vat_id",
        "invoice_number",
        "invoice_date",
        "due_date",
        "purchase_order",
        "currency",
        "subtotal",
        "total_tax",
        "invoice_total",
    )
    for key in keys:
        got = mapped.get(key)
        want = expected.get(key)
        if want is None:
            if got not in (None, ""):
                mismatches.append(f"{key}: expected null, got {got!r}")
            continue
        got_norm = _normalize_compare(str(got) if got is not None else None)
        want_norm = _normalize_compare(str(want))
        if got_norm != want_norm:
            mismatches.append(f"{key}: expected {want!r}, got {got!r}")
    return mismatches


def load_manifest() -> dict[str, dict[str, Any]]:
    entries = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return {entry["filename"]: entry for entry in entries}


def run_sample(filename: str, manifest_entry: dict[str, Any]) -> bool:
    document_path = SAMPLES_DIR / filename
    document_type = manifest_entry["document_type"]
    model_id = PREBUILT_INVOICE_MODEL if document_type == "invoice" else PREBUILT_RECEIPT_MODEL

    settings = Settings()
    client = create_document_intelligence_client(settings)
    result = analyze_document(client, model_id, document_path)
    snapshot = to_document_snapshot(result, model_id=model_id)

    if document_type == "invoice":
        extraction = map_invoice(snapshot)
        mapped = invoice_to_manifest_shape(extraction)
        print(json.dumps(extraction.model_dump(mode="json"), indent=2))
    else:
        extraction = map_receipt(snapshot)
        mapped = receipt_to_manifest_shape(extraction)
        print(json.dumps(extraction.model_dump(mode="json"), indent=2))

    mismatches = compare_to_expected(mapped, manifest_entry["expected"])
    if mismatches:
        print(f"MANIFEST mismatches for {filename}:")
        for line in mismatches:
            print(f"  - {line}")
        return False

    line_count = len(extraction.line_items)
    print(
        f"OK {filename}: doc_type={snapshot.doc_type!r} "
        f"confidence={snapshot.confidence} line_items={line_count}"
    )
    return True


def main() -> None:
    filenames = sys.argv[1:] if len(sys.argv) > 1 else list(DEFAULT_FILENAMES)
    manifest = load_manifest()
    all_ok = True
    for filename in filenames:
        entry = manifest.get(filename)
        if entry is None:
            print(f"Skip {filename}: not in manifest")
            all_ok = False
            continue
        print(f"=== {filename} ({entry['document_type']}) ===")
        if not run_sample(filename, entry):
            all_ok = False
        print()
    if not all_ok:
        raise SystemExit(1)


if __name__ == "__main__":
    main()