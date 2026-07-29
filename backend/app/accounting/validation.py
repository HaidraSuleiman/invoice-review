"""Validate GL selections against the fixed catalog (business policy, not model output)."""

from __future__ import annotations

from app.accounting.catalog import GL_ACCOUNT_BY_CODE, GlAccount


def validate_gl_account_code(code: str) -> GlAccount:
    normalized = code.strip()
    account = GL_ACCOUNT_BY_CODE.get(normalized)
    if account is None:
        known = ", ".join(sorted(GL_ACCOUNT_BY_CODE))
        raise ValueError(f"Unknown GL account code {code!r}; expected one of: {known}")
    return account
