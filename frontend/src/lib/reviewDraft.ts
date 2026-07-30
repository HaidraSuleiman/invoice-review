import type { DocumentPipelineResult, DocumentType } from "./types"

/** Editable fields a reviewer can adjust before accepting. */
export type ReviewDraft = {
  documentType: DocumentType
  partyName: string
  partyVatId: string
  counterpartyName: string
  counterpartyVatId: string
  documentNumber: string
  /** ISO calendar date `YYYY-MM-DD` — mirrors backend `datetime.date`. */
  documentDate: string
  /** ISO calendar date `YYYY-MM-DD`, or empty when optional. */
  dueDate: string
  purchaseOrder: string
  /** ISO 4217 currency code (three letters). */
  currency: string
  /** Decimal amount string — mirrors backend `Decimal` JSON. */
  subtotal: string
  totalTax: string
  total: string
  glAccountCode: string
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const DECIMAL_AMOUNT = /^-?\d+(\.\d+)?$/
const CURRENCY_CODE = /^[A-Za-z]{3}$/

export function draftFromPipelineResult(result: DocumentPipelineResult): ReviewDraft {
  const { extraction, gl_suggestion } = result

  if (extraction.document_type === "invoice") {
    return {
      documentType: "invoice",
      partyName: extraction.vendor_name ?? "",
      partyVatId: extraction.vendor_vat_id ?? "",
      counterpartyName: extraction.customer_name ?? "",
      counterpartyVatId: extraction.customer_vat_id ?? "",
      documentNumber: extraction.invoice_number ?? "",
      documentDate: toIsoDateInput(extraction.invoice_date),
      dueDate: toIsoDateInput(extraction.due_date),
      purchaseOrder: extraction.purchase_order ?? "",
      currency: toCurrencyInput(extraction.currency),
      subtotal: toAmountInput(extraction.subtotal),
      totalTax: toAmountInput(extraction.total_tax),
      total: toAmountInput(extraction.invoice_total),
      glAccountCode: gl_suggestion.account_code,
    }
  }

  return {
    documentType: "receipt",
    partyName: extraction.merchant_name ?? "",
    partyVatId: "",
    counterpartyName: "",
    counterpartyVatId: "",
    documentNumber: "",
    documentDate: toIsoDateInput(extraction.transaction_date),
    dueDate: "",
    purchaseOrder: "",
    currency: toCurrencyInput(extraction.currency),
    subtotal: toAmountInput(extraction.subtotal),
    totalTax: toAmountInput(extraction.total_tax),
    total: toAmountInput(extraction.total),
    glAccountCode: gl_suggestion.account_code,
  }
}

function isBlank(value: string): boolean {
  return value.trim() === ""
}

/**
 * Normalize API date strings to `YYYY-MM-DD` for `<input type="date">`.
 * Invalid or unparseable values become empty so the reviewer must pick a valid date.
 */
export function toIsoDateInput(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return ""
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return ""
  }
  const candidate = trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed
  return isIsoDate(candidate) ? candidate : ""
}

/** True when value is a real calendar day in `YYYY-MM-DD` (backend `date` JSON). */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value.trim())
  if (!match) {
    return false
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  )
}

export function toCurrencyInput(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return ""
  }
  return value.trim().toUpperCase()
}

export function isCurrencyCode(value: string): boolean {
  return CURRENCY_CODE.test(value.trim())
}

export function toAmountInput(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return ""
  }
  return String(value).trim()
}

/** Matches Python `Decimal` text the API already uses for money fields. */
export function isDecimalAmount(value: string): boolean {
  return DECIMAL_AMOUNT.test(value.trim())
}

/**
 * Labels of Northstar policy-required fields that are still empty.
 * Due date and purchase order stay optional (PO is a warning only).
 */
export function missingRequiredReviewFields(draft: ReviewDraft): string[] {
  const missing: string[] = []

  if (draft.documentType === "invoice") {
    if (isBlank(draft.partyName)) missing.push("Vendor name")
    if (isBlank(draft.partyVatId)) missing.push("Vendor VAT ID")
    if (isBlank(draft.counterpartyName)) missing.push("Customer name")
    if (isBlank(draft.counterpartyVatId)) missing.push("Customer VAT ID")
    if (isBlank(draft.documentNumber)) missing.push("Invoice number")
    if (isBlank(draft.documentDate)) missing.push("Invoice date")
    if (isBlank(draft.currency)) missing.push("Currency")
    if (isBlank(draft.total)) missing.push("Total")
    return missing
  }

  if (isBlank(draft.partyName)) missing.push("Merchant name")
  if (isBlank(draft.documentDate)) missing.push("Transaction date")
  if (isBlank(draft.currency)) missing.push("Currency")
  if (isBlank(draft.totalTax)) missing.push("VAT / tax")
  if (isBlank(draft.total)) missing.push("Total")
  return missing
}

/**
 * Format/type issues for filled draft values so they stay storable as
 * backend `date`, `Decimal`, and ISO currency strings.
 */
export function invalidReviewFormats(draft: ReviewDraft): string[] {
  const issues: string[] = []

  const documentDateLabel =
    draft.documentType === "invoice" ? "Invoice date" : "Transaction date"

  if (!isBlank(draft.documentDate) && !isIsoDate(draft.documentDate)) {
    issues.push(`${documentDateLabel} must be YYYY-MM-DD`)
  }
  if (!isBlank(draft.dueDate) && !isIsoDate(draft.dueDate)) {
    issues.push("Due date must be YYYY-MM-DD")
  }
  if (
    draft.documentType === "invoice" &&
    isIsoDate(draft.documentDate) &&
    isIsoDate(draft.dueDate) &&
    draft.dueDate < draft.documentDate
  ) {
    issues.push("Due date cannot be before invoice date")
  }

  if (!isBlank(draft.currency) && !isCurrencyCode(draft.currency)) {
    issues.push("Currency must be a 3-letter code (e.g. EUR)")
  }

  if (!isBlank(draft.subtotal) && !isDecimalAmount(draft.subtotal)) {
    issues.push("Subtotal must be a number")
  }
  if (!isBlank(draft.totalTax) && !isDecimalAmount(draft.totalTax)) {
    issues.push("VAT / tax must be a number")
  }
  if (!isBlank(draft.total) && !isDecimalAmount(draft.total)) {
    issues.push("Total must be a number")
  } else if (!isBlank(draft.total) && isDecimalAmount(draft.total)) {
    if (Number(draft.total) <= 0) {
      issues.push("Total must be positive")
    }
  }

  return issues
}
