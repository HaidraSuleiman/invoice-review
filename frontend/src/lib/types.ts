/** Mirrors backend DocumentPipelineResult JSON from POST /documents/process. */

export type DocumentType = "invoice" | "receipt"

export type DocumentClassification = {
  document_type: DocumentType
  confidence: number
}

export type DocumentIntelligenceSnapshot = {
  model_id: string
  doc_type: string | null
  confidence: number | null
  fields: Record<string, unknown>
}

export type InvoiceLineItem = {
  description: string | null
  quantity: string | null
  unit_price: string | null
  amount: string | null
}

export type InvoiceExtraction = {
  document_type: "invoice"
  doc_type: string | null
  confidence: number | null
  vendor_name: string | null
  vendor_vat_id: string | null
  customer_name: string | null
  customer_vat_id: string | null
  customer_address: string | null
  invoice_number: string | null
  /** ISO `YYYY-MM-DD` from backend `datetime.date`. */
  invoice_date: string | null
  /** ISO `YYYY-MM-DD` from backend `datetime.date`. */
  due_date: string | null
  purchase_order: string | null
  currency: string | null
  /** Decimal amount serialized as a JSON string. */
  subtotal: string | null
  total_tax: string | null
  invoice_total: string | null
  line_items: InvoiceLineItem[]
}

export type ReceiptLineItem = {
  description: string | null
  quantity: string | null
  price: string | null
  total_price: string | null
}

export type ReceiptExtraction = {
  document_type: "receipt"
  doc_type: string | null
  confidence: number | null
  merchant_name: string | null
  merchant_address: string | null
  country_region: string | null
  receipt_type: string | null
  /** ISO `YYYY-MM-DD` from backend `datetime.date`. */
  transaction_date: string | null
  transaction_time: string | null
  currency: string | null
  /** Decimal amount serialized as a JSON string. */
  subtotal: string | null
  total_tax: string | null
  total: string | null
  line_items: ReceiptLineItem[]
}

export type FinancialExtraction = InvoiceExtraction | ReceiptExtraction

export type VatFormatCheck = {
  field: "vendor_vat_id" | "customer_vat_id"
  present: boolean
  raw_value: string | null
  compact_value: string | null
  valid: boolean | null
  message: string | null
}

export type TotalsReconciliation = {
  subtotal: string | null
  total_tax: string | null
  total: string | null
  expected_total: string | null
  delta: string | null
  reconciles: boolean | null
}

export type ExtractionValidation = {
  document_type: DocumentType
  vat_checks: VatFormatCheck[]
  totals: TotalsReconciliation
  issues: string[]
}

export type GlSuggestion = {
  account_code: string
  account_name: string
  account_description: string
  confidence: number
  rationale: string
  document_type: DocumentType
  deployment: string
}

export type DocumentPipelineResult = {
  classification: DocumentClassification
  snapshot: DocumentIntelligenceSnapshot
  extraction: FinancialExtraction
  validation: ExtractionValidation
  gl_suggestion: GlSuggestion
  line_item_count: number
}

/** Mirrors backend ProcessDocumentResponse. */
export type ProcessDocumentResponse = {
  original_filename: string
  stored_filename: string
  result: DocumentPipelineResult
}

export type ReviewStatus = "accepted" | "rejected"

/** Payload for POST /reviews — dates ISO, amounts as decimal strings/null. */
export type ReviewCreatePayload = {
  status: ReviewStatus
  original_filename: string
  stored_filename: string
  document_type: DocumentType
  party_name: string
  party_vat_id: string
  counterparty_name: string
  counterparty_vat_id: string
  document_number: string
  document_date: string | null
  due_date: string | null
  purchase_order: string
  currency: string
  subtotal: string | null
  total_tax: string | null
  total: string | null
  gl_account_code: string
  notes: string
}

export type ReviewSummary = {
  id: string
  status: ReviewStatus
  document_type: DocumentType
  original_filename: string
  party_name: string
  document_number: string | null
  currency: string | null
  total: string | null
  gl_account_code: string | null
  decided_at: string
}

export type ReviewRecord = ReviewSummary & {
  stored_filename: string
  party_vat_id: string | null
  counterparty_name: string | null
  counterparty_vat_id: string | null
  document_date: string | null
  due_date: string | null
  purchase_order: string | null
  subtotal: string | null
  total_tax: string | null
  notes: string | null
}
