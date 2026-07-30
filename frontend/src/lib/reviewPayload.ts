import type { ReviewCreatePayload, ReviewStatus } from "./types"
import type { ReviewDraft } from "./reviewDraft"

/** Build the POST /reviews body from the editable draft + upload identity. */
export function reviewPayloadFromDraft(options: {
  status: ReviewStatus
  draft: ReviewDraft
  originalFilename: string
  storedFilename: string
  notes?: string
}): ReviewCreatePayload {
  const { status, draft, originalFilename, storedFilename, notes = "" } = options
  return {
    status,
    original_filename: originalFilename,
    stored_filename: storedFilename,
    document_type: draft.documentType,
    party_name: draft.partyName,
    party_vat_id: draft.partyVatId,
    counterparty_name: draft.counterpartyName,
    counterparty_vat_id: draft.counterpartyVatId,
    document_number: draft.documentNumber,
    document_date: blankToNull(draft.documentDate),
    due_date: blankToNull(draft.dueDate),
    purchase_order: draft.purchaseOrder,
    currency: draft.currency,
    subtotal: blankToNull(draft.subtotal),
    total_tax: blankToNull(draft.totalTax),
    total: blankToNull(draft.total),
    gl_account_code: draft.glAccountCode,
    notes,
  }
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}
