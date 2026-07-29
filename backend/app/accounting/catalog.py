"""Fixed general-ledger accounts for the Northstar case study."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class GlAccount:
    code: str
    name: str
    description: str


NORTHSTAR_GL_CATALOG: tuple[GlAccount, ...] = (
    GlAccount(
        "6100",
        "Cleaning services",
        "Contract and ad-hoc cleaning for sites and offices.",
    ),
    GlAccount(
        "6200",
        "Building maintenance",
        "Repairs, janitorial supplies, and general facility upkeep.",
    ),
    GlAccount(
        "6300",
        "Electrical services",
        "Electricians, wiring, and electrical safety work.",
    ),
    GlAccount(
        "6400",
        "Plumbing and heating",
        "Plumbers, HVAC, and heating maintenance.",
    ),
    GlAccount(
        "6500",
        "Equipment rental",
        "Rented tools, lifts, and temporary equipment.",
    ),
    GlAccount(
        "6600",
        "Office supplies",
        "Stationery, small consumables, and office materials.",
    ),
    GlAccount(
        "6700",
        "Fuel and travel",
        "Fuel receipts, mileage-related expenses, and parking.",
    ),
    GlAccount(
        "6800",
        "Professional fees",
        "Legal, audit, consulting, and other professional services.",
    ),
    GlAccount(
        "6900",
        "Utilities",
        "Electricity, water, gas, and waste for facilities.",
    ),
    GlAccount(
        "7000",
        "Other operating expenses",
        "Operating costs that do not fit a specific account above.",
    ),
)

GL_ACCOUNT_BY_CODE: dict[str, GlAccount] = {
    account.code: account for account in NORTHSTAR_GL_CATALOG
}


def format_catalog_for_prompt() -> str:
    lines = ["Northstar GL catalog (choose exactly one code):"]
    for account in NORTHSTAR_GL_CATALOG:
        lines.append(f"- {account.code}: {account.name} — {account.description}")
    return "\n".join(lines)
