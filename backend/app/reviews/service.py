"""Orchestrate review decisions and history without HTTP concerns."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

from app.accounting.validation import validate_gl_account_code
from app.config import UPLOAD_DIR
from app.db import session_scope
from app.reviews import repository
from app.reviews.models import ReviewRow
from app.reviews.schemas import ReviewCreate, ReviewRecord, ReviewSummary


class ReviewValidationError(ValueError):
    """Raised when an accept/reject payload cannot be stored."""


def create_review(payload: ReviewCreate) -> ReviewRecord:
    _validate_stored_file(payload.stored_filename)
    if payload.status == "accepted":
        _validate_accept(payload)

    row = ReviewRow(
        id=uuid.uuid4().hex,
        status=payload.status,
        document_type=payload.document_type,
        original_filename=payload.original_filename.strip(),
        stored_filename=payload.stored_filename.strip(),
        decided_at=datetime.now(UTC),
        party_name=payload.party_name.strip(),
        party_vat_id=_optional_str(payload.party_vat_id),
        counterparty_name=_optional_str(payload.counterparty_name),
        counterparty_vat_id=_optional_str(payload.counterparty_vat_id),
        document_number=_optional_str(payload.document_number),
        document_date=payload.document_date,
        due_date=payload.due_date,
        purchase_order=_optional_str(payload.purchase_order),
        currency=_optional_currency(payload.currency),
        subtotal=payload.subtotal,
        total_tax=payload.total_tax,
        total=payload.total,
        gl_account_code=_optional_str(payload.gl_account_code),
        notes=_optional_str(payload.notes),
    )

    with session_scope() as session:
        saved = repository.insert_review(session, row)
        return _to_record(saved)


def list_review_summaries() -> list[ReviewSummary]:
    with session_scope() as session:
        rows = repository.list_reviews(session)
        return [_to_summary(row) for row in rows]


def get_review_record(review_id: str) -> ReviewRecord | None:
    with session_scope() as session:
        row = repository.get_review(session, review_id)
        if row is None:
            return None
        return _to_record(row)


def delete_review_record(review_id: str) -> bool:
    with session_scope() as session:
        row = repository.delete_review(session, review_id)
        if row is None:
            return False
        stored_filename = row.stored_filename

    _delete_upload_file(stored_filename)
    return True


def _validate_stored_file(stored_filename: str) -> None:
    name = Path(stored_filename.strip()).name
    if name != stored_filename.strip() or not name:
        raise ReviewValidationError("stored_filename must be a plain upload filename")
    path = UPLOAD_DIR / name
    if not path.is_file():
        raise ReviewValidationError(f"Uploaded file {name!r} was not found")


def _validate_accept(payload: ReviewCreate) -> None:
    missing: list[str] = []

    if not payload.party_name.strip():
        missing.append("party_name")
    if payload.document_date is None:
        missing.append("document_date")
    if not payload.currency.strip():
        missing.append("currency")
    if payload.total is None:
        missing.append("total")
    elif payload.total <= 0:
        raise ReviewValidationError("total must be positive to accept")

    if payload.document_type == "invoice":
        if not payload.party_vat_id.strip():
            missing.append("party_vat_id")
        if not payload.counterparty_name.strip():
            missing.append("counterparty_name")
        if not payload.counterparty_vat_id.strip():
            missing.append("counterparty_vat_id")
        if not payload.document_number.strip():
            missing.append("document_number")
        if (
            payload.due_date is not None
            and payload.document_date is not None
            and payload.due_date < payload.document_date
        ):
            raise ReviewValidationError("due_date cannot be before document_date")
    else:
        if payload.total_tax is None:
            missing.append("total_tax")

    if not payload.gl_account_code.strip():
        missing.append("gl_account_code")
    else:
        try:
            validate_gl_account_code(payload.gl_account_code)
        except ValueError as exc:
            raise ReviewValidationError(str(exc)) from exc

    currency = payload.currency.strip().upper()
    if currency and len(currency) != 3:
        raise ReviewValidationError("currency must be a 3-letter code")

    if missing:
        raise ReviewValidationError(
            "Cannot accept with missing required fields: " + ", ".join(missing)
        )


def _optional_str(value: str) -> str | None:
    trimmed = value.strip()
    return trimmed or None


def _optional_currency(value: str) -> str | None:
    trimmed = value.strip().upper()
    return trimmed or None


def _delete_upload_file(stored_filename: str) -> None:
    path = UPLOAD_DIR / Path(stored_filename).name
    if path.is_file():
        path.unlink()


def _to_record(row: ReviewRow) -> ReviewRecord:
    return ReviewRecord(
        id=row.id,
        status=row.status,  # type: ignore[arg-type]
        document_type=row.document_type,  # type: ignore[arg-type]
        original_filename=row.original_filename,
        stored_filename=row.stored_filename,
        decided_at=row.decided_at,
        party_name=row.party_name,
        party_vat_id=row.party_vat_id,
        counterparty_name=row.counterparty_name,
        counterparty_vat_id=row.counterparty_vat_id,
        document_number=row.document_number,
        document_date=row.document_date,
        due_date=row.due_date,
        purchase_order=row.purchase_order,
        currency=row.currency,
        subtotal=_decimal(row.subtotal),
        total_tax=_decimal(row.total_tax),
        total=_decimal(row.total),
        gl_account_code=row.gl_account_code,
        notes=row.notes,
    )


def _to_summary(row: ReviewRow) -> ReviewSummary:
    return ReviewSummary(
        id=row.id,
        status=row.status,  # type: ignore[arg-type]
        document_type=row.document_type,  # type: ignore[arg-type]
        original_filename=row.original_filename,
        party_name=row.party_name,
        document_number=row.document_number,
        currency=row.currency,
        total=_decimal(row.total),
        gl_account_code=row.gl_account_code,
        decided_at=row.decided_at,
    )


def _decimal(value: Decimal | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))
