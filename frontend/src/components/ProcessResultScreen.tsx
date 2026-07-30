import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react"

import { ApiError, createReview } from "../lib/api"
import { glAccountByCode, NORTHSTAR_GL_CATALOG } from "../lib/glCatalog"
import {
  draftFromPipelineResult,
  invalidReviewFormats,
  missingRequiredReviewFields,
  type ReviewDraft,
} from "../lib/reviewDraft"
import { reviewPayloadFromDraft } from "../lib/reviewPayload"
import type {
  DocumentPipelineResult,
  ExtractionValidation,
  FinancialExtraction,
  ReviewStatus,
  VatFormatCheck,
} from "../lib/types"

type ProcessResultScreenProps = {
  originalFilename: string
  storedFilename: string
  result: DocumentPipelineResult
  onReset: () => void
  onOpenHistory: () => void
}

type FieldKey = Exclude<keyof ReviewDraft, "documentType">

const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-line bg-panel px-3 py-2.5 text-ink outline-none transition focus:border-accent"

type FieldAlert = {
  tone: "error" | "warn"
  message: string
}

export function ProcessResultScreen({
  originalFilename,
  storedFilename,
  result,
  onReset,
  onOpenHistory,
}: ProcessResultScreenProps) {
  const [draft, setDraft] = useState<ReviewDraft>(() => draftFromPipelineResult(result))
  const [savedStatus, setSavedStatus] = useState<ReviewStatus | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const isInvoice = draft.documentType === "invoice"
  const selectedGl = glAccountByCode(draft.glAccountCode)
  const missingRequired = missingRequiredReviewFields(draft)
  const formatIssues = invalidReviewFormats(draft)
  const canAccept =
    missingRequired.length === 0 &&
    formatIssues.length === 0 &&
    selectedGl !== undefined &&
    !isSaving
  const alerts = buildFieldAlerts(result)
  const partyName = display(extractionPartyName(result.extraction))
  const totalValue = display(extractionTotal(result.extraction))
  const currency = display(result.extraction.currency)
  const confidencePct = Math.round(result.classification.confidence * 100)
  const issueCount = result.validation.issues.length

  function updateField(key: FieldKey, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
    setFormError(null)
  }

  async function saveDecision(status: ReviewStatus) {
    if (status === "accepted") {
      const stillMissing = missingRequiredReviewFields(draft)
      if (stillMissing.length > 0) {
        setFormError(`Fill required fields before accepting: ${stillMissing.join(", ")}.`)
        return
      }
      const stillInvalid = invalidReviewFormats(draft)
      if (stillInvalid.length > 0) {
        setFormError(stillInvalid.join(". ") + ".")
        return
      }
      if (!glAccountByCode(draft.glAccountCode)) {
        setFormError("Select a valid Northstar GL account before accepting.")
        return
      }
    }

    setIsSaving(true)
    setFormError(null)
    try {
      await createReview(
        reviewPayloadFromDraft({
          status,
          draft,
          originalFilename,
          storedFilename,
        }),
      )
      setSavedStatus(status)
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.detail
          : error instanceof Error
            ? error.message
            : "Could not save the decision."
      setFormError(message)
    } finally {
      setIsSaving(false)
    }
  }

  function handleAccept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveDecision("accepted")
  }

  if (savedStatus) {
    const isAccepted = savedStatus === "accepted"
    return (
      <section className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10">
        <p className="text-sm font-medium tracking-[0.12em] text-accent uppercase">
          {isAccepted ? "Accepted" : "Rejected"}
        </p>
        <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
          {isAccepted ? "Saved for bookkeeping" : "Saved as rejected"}
        </h1>
        <p className="mt-3 max-w-xl text-ink-muted">
          The {savedStatus} decision for{" "}
          <span className="font-medium text-ink">{originalFilename}</span> is stored in
          the local SQLite history.
        </p>

        <dl className="mt-12 divide-y divide-line border-y border-line">
          <SummaryRow label="Status" value={savedStatus} />
          <SummaryRow label="Document type" value={draft.documentType} />
          <SummaryRow
            label={isInvoice ? "Vendor" : "Merchant"}
            value={draft.partyName || "—"}
          />
          {isInvoice ? (
            <SummaryRow label="Invoice number" value={draft.documentNumber || "—"} />
          ) : null}
          <SummaryRow
            label="Total"
            value={`${draft.currency} ${draft.total}`.trim() || "—"}
          />
          <SummaryRow
            label="GL account"
            value={
              selectedGl
                ? `${selectedGl.code} — ${selectedGl.name}`
                : draft.glAccountCode || "—"
            }
          />
        </dl>

        <div className="mt-12 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onOpenHistory}
            className="rounded-md bg-accent px-6 py-3 text-base font-medium text-white transition hover:bg-accent-hover"
          >
            View history
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-line bg-panel px-6 py-3 text-base font-medium text-ink transition hover:border-accent"
          >
            Review another document
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10">
      <header>
        <p className="text-sm font-medium tracking-[0.12em] text-accent uppercase">
          Pipeline result
        </p>
        <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
          Extracted values
        </h1>
        <p className="mt-3 max-w-xl text-ink-muted">
          Automatic output for{" "}
          <span className="font-medium text-ink">{originalFilename}</span>. Review the
          summary, then accept or reject below.
        </p>
      </header>

      {issueCount > 0 ? (
        <div className="mt-8 border-l-4 border-danger bg-[#fdf2f2] px-5 py-4 text-sm text-danger">
          <p className="font-medium">
            {issueCount} validation issue{issueCount === 1 ? "" : "s"}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {result.validation.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-8 border-l-4 border-accent bg-accent-soft px-5 py-3 text-sm text-accent">
          No automatic validation issues reported.
        </p>
      )}

      {/* Document summary — hero totals, not a card grid */}
      <div className="mt-10 flex flex-col gap-8 border-b border-line pb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-ink-muted">
            {isInvoice ? "Vendor" : "Merchant"}
          </p>
          <p
            className={[
              "mt-1 font-display text-2xl leading-snug text-ink sm:text-3xl",
              alerts.partyName ? "text-danger" : "",
            ].join(" ")}
          >
            {partyName}
          </p>
          {alerts.partyName ? (
            <p className="mt-1 text-sm text-danger">{alerts.partyName.message}</p>
          ) : null}
          <p className="mt-3 text-sm text-ink-muted">
            <span className="capitalize text-ink">{result.classification.document_type}</span>
            {" · "}
            {confidencePct}% classification confidence
            {" · "}
            {result.line_item_count} line item
            {result.line_item_count === 1 ? "" : "s"}
          </p>
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="text-sm text-ink-muted">Total</p>
          <p
            className={[
              "mt-1 font-display text-3xl tabular-nums tracking-tight text-ink sm:text-4xl",
              alerts.total || alerts.totals ? "text-danger" : "",
            ].join(" ")}
          >
            {currency !== "—" ? (
              <>
                <span className="mr-2 text-xl text-ink-muted sm:text-2xl">
                  {currency}
                </span>
                {totalValue}
              </>
            ) : (
              totalValue
            )}
          </p>
          {(alerts.total ?? alerts.totals) ? (
            <p
              className={[
                "mt-1 text-sm",
                (alerts.total ?? alerts.totals)?.tone === "error"
                  ? "text-danger"
                  : "text-warn",
              ].join(" ")}
            >
              {(alerts.total ?? alerts.totals)?.message}
            </p>
          ) : null}
        </div>
      </div>

      {/* Grouped facts as rows */}
      <div className="mt-10 grid gap-10 sm:grid-cols-2">
        <FactGroup title={isInvoice ? "Parties" : "Merchant"}>
          {isInvoice ? (
            <>
              <FactRow
                label="Vendor VAT ID"
                value={display(
                  result.extraction.document_type === "invoice"
                    ? result.extraction.vendor_vat_id
                    : null,
                )}
                alert={alerts.vendorVat}
              />
              <FactRow
                label="Customer name"
                value={display(
                  result.extraction.document_type === "invoice"
                    ? result.extraction.customer_name
                    : null,
                )}
                alert={alerts.customerName}
              />
              <FactRow
                label="Customer VAT ID"
                value={display(
                  result.extraction.document_type === "invoice"
                    ? result.extraction.customer_vat_id
                    : null,
                )}
                alert={alerts.customerVat}
              />
            </>
          ) : (
            <FactRow
              label="Transaction date"
              value={display(
                result.extraction.document_type === "receipt"
                  ? result.extraction.transaction_date
                  : null,
              )}
              alert={alerts.documentDate}
            />
          )}
        </FactGroup>

        {isInvoice ? (
          <FactGroup title="Document">
            <FactRow
              label="Invoice number"
              value={display(
                result.extraction.document_type === "invoice"
                  ? result.extraction.invoice_number
                  : null,
              )}
              alert={alerts.documentNumber}
            />
            <FactRow
              label="Invoice date"
              value={display(
                result.extraction.document_type === "invoice"
                  ? result.extraction.invoice_date
                  : null,
              )}
            />
            <FactRow
              label="Due date"
              value={display(
                result.extraction.document_type === "invoice"
                  ? result.extraction.due_date
                  : null,
              )}
            />
            <FactRow
              label="Purchase order"
              value={display(
                result.extraction.document_type === "invoice"
                  ? result.extraction.purchase_order
                  : null,
              )}
              alert={alerts.purchaseOrder}
            />
          </FactGroup>
        ) : (
          <FactGroup title="Amounts">
            <FactRow
              label="Currency"
              value={currency}
              alert={alerts.currency}
            />
            <FactRow
              label="Subtotal"
              value={display(result.extraction.subtotal)}
              alert={alerts.totals}
            />
            <FactRow
              label="VAT / tax"
              value={display(result.extraction.total_tax)}
              alert={alerts.totals}
            />
          </FactGroup>
        )}
      </div>

      {isInvoice ? (
        <div className="mt-10">
          <FactGroup title="Amounts">
            <div className="grid gap-x-10 sm:grid-cols-2">
              <FactRow
                label="Currency"
                value={currency}
                alert={alerts.currency}
              />
              <FactRow
                label="Subtotal"
                value={display(result.extraction.subtotal)}
                alert={alerts.totals}
              />
              <FactRow
                label="VAT / tax"
                value={display(result.extraction.total_tax)}
                alert={alerts.totals}
              />
              <FactRow
                label="Total"
                value={totalValue}
                alert={alerts.total ?? alerts.totals}
                emphasize
              />
            </div>
          </FactGroup>
        </div>
      ) : null}

      {/* GL suggestion as a soft recommendation strip */}
      <aside className="mt-10 bg-accent-soft/70 px-5 py-5 sm:px-6">
        <p className="text-sm font-medium tracking-[0.1em] text-accent uppercase">
          Suggested GL
        </p>
        <p className="mt-2 font-display text-xl text-ink">
          {result.gl_suggestion.account_code}
          <span className="mx-2 text-ink-muted">—</span>
          {result.gl_suggestion.account_name}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {result.gl_suggestion.rationale}
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          Model confidence {Math.round(result.gl_suggestion.confidence * 100)}%
        </p>
      </aside>

      {/* Human review */}
      <div className="mt-16 border-t border-line pt-12">
        <p className="text-sm font-medium tracking-[0.12em] text-accent uppercase">
          Human review
        </p>
        <h2 className="mt-2 font-display text-2xl text-ink sm:text-3xl">
          Adjust if needed
        </h2>
        <p className="mt-3 max-w-xl text-ink-muted">
          Accept needs every required field filled. If something is missing — like a VAT
          ID — use <span className="font-medium text-ink">Reject</span> to save this
          draft as rejected in history. Discard leaves nothing in the database.
        </p>

        <form className="mt-10 space-y-10" onSubmit={handleAccept}>
          <fieldset>
            <legend className="font-display text-xl text-ink">Document</legend>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field
                label={isInvoice ? "Vendor name" : "Merchant name"}
                value={draft.partyName}
                required
                onChange={(value) => updateField("partyName", value)}
              />
              {isInvoice ? (
                <>
                  <Field
                    label="Vendor VAT ID"
                    value={draft.partyVatId}
                    required
                    onChange={(value) => updateField("partyVatId", value)}
                  />
                  <Field
                    label="Customer name"
                    value={draft.counterpartyName}
                    required
                    onChange={(value) => updateField("counterpartyName", value)}
                  />
                  <Field
                    label="Customer VAT ID"
                    value={draft.counterpartyVatId}
                    required
                    onChange={(value) => updateField("counterpartyVatId", value)}
                  />
                  <Field
                    label="Invoice number"
                    value={draft.documentNumber}
                    required
                    onChange={(value) => updateField("documentNumber", value)}
                  />
                  <Field
                    label="Invoice date"
                    value={draft.documentDate}
                    type="date"
                    required
                    onChange={(value) => updateField("documentDate", value)}
                  />
                  <Field
                    label="Due date"
                    value={draft.dueDate}
                    type="date"
                    onChange={(value) => updateField("dueDate", value)}
                  />
                  <Field
                    label="Purchase order"
                    value={draft.purchaseOrder}
                    onChange={(value) => updateField("purchaseOrder", value)}
                  />
                </>
              ) : (
                <Field
                  label="Transaction date"
                  value={draft.documentDate}
                  type="date"
                  required
                  onChange={(value) => updateField("documentDate", value)}
                />
              )}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-display text-xl text-ink">Amounts</legend>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field
                label="Currency"
                value={draft.currency}
                required
                maxLength={3}
                autoCapitalize="characters"
                spellCheck={false}
                onChange={(value) =>
                  updateField("currency", value.toUpperCase().replace(/[^A-Z]/g, ""))
                }
              />
              <Field
                label="Subtotal"
                value={draft.subtotal}
                inputMode="decimal"
                onChange={(value) => updateField("subtotal", value)}
              />
              <Field
                label="VAT / tax"
                value={draft.totalTax}
                required={!isInvoice}
                inputMode="decimal"
                onChange={(value) => updateField("totalTax", value)}
              />
              <Field
                label="Total"
                value={draft.total}
                required
                inputMode="decimal"
                onChange={(value) => updateField("total", value)}
              />
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-display text-xl text-ink">GL account</legend>
            <label className="mt-5 block text-sm text-ink-muted">
              Selected account
              <select
                className={INPUT_CLASS}
                value={draft.glAccountCode}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  updateField("glAccountCode", event.target.value)
                }
              >
                {NORTHSTAR_GL_CATALOG.map((account) => (
                  <option key={account.code} value={account.code}>
                    {account.code} — {account.name}
                  </option>
                ))}
              </select>
            </label>
            {selectedGl ? (
              <p className="mt-2 text-sm text-ink-muted">{selectedGl.description}</p>
            ) : null}
          </fieldset>

          {formError ? (
            <p className="text-sm text-danger" role="alert">
              {formError}
            </p>
          ) : null}

          {!canAccept && missingRequired.length > 0 ? (
            <p className="text-sm text-warn" role="status">
              Accept is disabled until these required fields are filled:{" "}
              {missingRequired.join(", ")}. You can still{" "}
              <span className="font-medium">Reject</span> and save this document as
              rejected.
            </p>
          ) : null}

          {!canAccept && missingRequired.length === 0 && formatIssues.length > 0 ? (
            <p className="text-sm text-warn" role="status">
              Accept is disabled until values match storable formats:{" "}
              {formatIssues.join("; ")}. You can still Reject with the current draft.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 border-t border-line pt-8">
            <button
              type="submit"
              disabled={!canAccept}
              className="rounded-md bg-accent px-6 py-3 text-base font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? "Saving…" : "Accept review"}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                void saveDecision("rejected")
              }}
              className="rounded-md border-2 border-danger bg-[#fdf2f2] px-6 py-3 text-base font-medium text-danger transition hover:bg-[#f8e4e4] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSaving ? "Saving…" : "Reject document"}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={onReset}
              className="rounded-md border border-line bg-panel px-6 py-3 text-base font-medium text-ink-muted transition hover:border-accent hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Discard without saving
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

function display(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim() === "") {
    return "—"
  }
  return value
}

function extractionPartyName(extraction: FinancialExtraction): string | null {
  return extraction.document_type === "invoice"
    ? extraction.vendor_name
    : extraction.merchant_name
}

function extractionTotal(extraction: FinancialExtraction): string | null {
  return extraction.document_type === "invoice"
    ? extraction.invoice_total
    : extraction.total
}

function vatAlert(checks: VatFormatCheck[], field: VatFormatCheck["field"]): FieldAlert | undefined {
  const check = checks.find((item) => item.field === field)
  if (!check) {
    return undefined
  }
  if (!check.present) {
    return { tone: "error", message: "Missing" }
  }
  if (check.valid === false) {
    return { tone: "error", message: check.message ?? "Invalid EU VAT format" }
  }
  return undefined
}

function missingAlert(value: string | null | undefined, label: string): FieldAlert | undefined {
  if (value === null || value === undefined || value.trim() === "") {
    return { tone: "warn", message: `${label} is empty` }
  }
  return undefined
}

function buildFieldAlerts(result: DocumentPipelineResult): {
  partyName?: FieldAlert
  vendorVat?: FieldAlert
  customerName?: FieldAlert
  customerVat?: FieldAlert
  documentNumber?: FieldAlert
  documentDate?: FieldAlert
  purchaseOrder?: FieldAlert
  currency?: FieldAlert
  total?: FieldAlert
  totals?: FieldAlert
} {
  const { extraction, validation } = result
  const totalsAlert = totalsFieldAlert(validation)

  if (extraction.document_type === "invoice") {
    return {
      partyName: missingAlert(extraction.vendor_name, "Vendor name"),
      vendorVat: vatAlert(validation.vat_checks, "vendor_vat_id"),
      customerName: missingAlert(extraction.customer_name, "Customer name"),
      customerVat: vatAlert(validation.vat_checks, "customer_vat_id"),
      documentNumber: missingAlert(extraction.invoice_number, "Invoice number"),
      purchaseOrder: missingAlert(extraction.purchase_order, "Purchase order"),
      currency: missingAlert(extraction.currency, "Currency"),
      total: missingAlert(extraction.invoice_total, "Total"),
      totals: totalsAlert,
    }
  }

  return {
    partyName: missingAlert(extraction.merchant_name, "Merchant name"),
    documentDate: missingAlert(extraction.transaction_date, "Transaction date"),
    currency: missingAlert(extraction.currency, "Currency"),
    total: missingAlert(extraction.total, "Total"),
    totals: totalsAlert,
  }
}

function totalsFieldAlert(validation: ExtractionValidation): FieldAlert | undefined {
  if (validation.totals.reconciles === false) {
    const delta = validation.totals.delta ?? "?"
    return {
      tone: "error",
      message: `Totals do not reconcile (delta ${delta})`,
    }
  }
  if (validation.totals.reconciles === null) {
    return {
      tone: "warn",
      message: "Not enough amount fields to reconcile",
    }
  }
  return undefined
}

function FactGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div>
      <h3 className="text-sm font-medium tracking-[0.08em] text-ink-muted uppercase">
        {title}
      </h3>
      <dl className="mt-3 divide-y divide-line border-t border-line">{children}</dl>
    </div>
  )
}

function FactRow({
  label,
  value,
  alert,
  emphasize = false,
}: {
  label: string
  value: string
  alert?: FieldAlert
  emphasize?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-sm text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-left sm:text-right">
        <span
          className={[
            "break-words text-ink",
            emphasize ? "text-base font-semibold" : "font-medium",
            alert?.tone === "error" ? "text-danger" : "",
            alert?.tone === "warn" ? "text-warn" : "",
          ].join(" ")}
        >
          {value}
        </span>
        {alert ? (
          <span
            className={[
              "mt-0.5 block text-xs",
              alert.tone === "error" ? "text-danger" : "text-warn",
            ].join(" ")}
          >
            {alert.message}
          </span>
        ) : null}
      </dd>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  inputMode,
  maxLength,
  autoCapitalize,
  spellCheck,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: "text" | "date"
  inputMode?: "decimal" | "text"
  maxLength?: number
  autoCapitalize?: "characters" | "off"
  spellCheck?: boolean
}) {
  const isEmpty = value.trim() === ""
  return (
    <label className="block text-sm text-ink-muted">
      {label}
      {required ? <span className="text-danger"> *</span> : null}
      {type === "date" ? (
        <span className="ml-1 text-xs text-ink-muted">(YYYY-MM-DD)</span>
      ) : null}
      <input
        type={type}
        required={required}
        inputMode={inputMode}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        spellCheck={spellCheck}
        aria-invalid={required && isEmpty ? true : undefined}
        className={[
          INPUT_CLASS,
          required && isEmpty ? "border-warn/50" : "",
        ].join(" ")}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      />
    </label>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-lg font-medium capitalize text-ink sm:text-right">{value}</dd>
    </div>
  )
}
