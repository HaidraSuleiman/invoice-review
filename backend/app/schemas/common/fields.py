from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

DocumentFieldDict = dict[str, Any]


def field_string(field: DocumentFieldDict | None) -> str | None:
    if not field:
        return None
    value = field.get("valueString")
    if isinstance(value, str) and value.strip():
        return value.strip()
    content = field.get("content")
    if isinstance(content, str) and content.strip():
        return content.strip()
    return None


def field_date(field: DocumentFieldDict | None) -> date | None:
    if not field:
        return None
    raw = field.get("valueDate")
    if isinstance(raw, str) and raw.strip():
        return date.fromisoformat(raw.strip())
    content = field.get("content")
    if isinstance(content, str) and content.strip():
        normalized = content.strip()
        if len(normalized) == 10 and normalized[4] == "-":
            return date.fromisoformat(normalized)
    return None


def field_number(field: DocumentFieldDict | None) -> Decimal | None:
    if not field:
        return None
    raw = field.get("valueNumber")
    if raw is None:
        return None
    return Decimal(str(raw))


def field_currency(field: DocumentFieldDict | None) -> tuple[str | None, Decimal | None]:
    if not field:
        return None, None
    value = field.get("valueCurrency")
    if not isinstance(value, dict):
        return None, None
    code = value.get("currencyCode")
    amount = value.get("amount")
    currency_code = code.strip() if isinstance(code, str) and code.strip() else None
    if amount is None:
        return currency_code, None
    return currency_code, Decimal(str(amount))


def field_array_objects(field: DocumentFieldDict | None) -> list[dict[str, DocumentFieldDict]]:
    if not field:
        return []
    rows = field.get("valueArray")
    if not isinstance(rows, list):
        return []
    objects: list[dict[str, DocumentFieldDict]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        value_object = row.get("valueObject")
        if isinstance(value_object, dict):
            objects.append(value_object)
    return objects
