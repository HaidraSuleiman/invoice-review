/** Fixed Northstar GL catalog — mirrors backend/app/accounting/catalog.py. */

export type GlCatalogAccount = {
  code: string
  name: string
  description: string
}

export const NORTHSTAR_GL_CATALOG: readonly GlCatalogAccount[] = [
  {
    code: "6100",
    name: "Cleaning services",
    description: "Contract and ad-hoc cleaning for sites and offices.",
  },
  {
    code: "6200",
    name: "Building maintenance",
    description: "Repairs, janitorial supplies, and general facility upkeep.",
  },
  {
    code: "6300",
    name: "Electrical services",
    description: "Electricians, wiring, and electrical safety work.",
  },
  {
    code: "6400",
    name: "Plumbing and heating",
    description: "Plumbers, HVAC, and heating maintenance.",
  },
  {
    code: "6500",
    name: "Equipment rental",
    description: "Rented tools, lifts, and temporary equipment.",
  },
  {
    code: "6600",
    name: "Office supplies",
    description: "Stationery, small consumables, and office materials.",
  },
  {
    code: "6700",
    name: "Fuel and travel",
    description: "Fuel receipts, mileage-related expenses, and parking.",
  },
  {
    code: "6800",
    name: "Professional fees",
    description: "Legal, audit, consulting, and other professional services.",
  },
  {
    code: "6900",
    name: "Utilities",
    description: "Electricity, water, gas, and waste for facilities.",
  },
  {
    code: "7000",
    name: "Other operating expenses",
    description: "Operating costs that do not fit a specific account above.",
  },
] as const

export function glAccountByCode(code: string): GlCatalogAccount | undefined {
  return NORTHSTAR_GL_CATALOG.find((account) => account.code === code)
}
