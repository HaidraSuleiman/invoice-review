import type { DocumentPipelineResult, FinancialExtraction } from "../lib/types"

type ProcessResultScreenProps = {
  fileName: string
  result: DocumentPipelineResult
  onReset: () => void
}

function partyLabel(extraction: FinancialExtraction): string {
  if (extraction.document_type === "invoice") {
    return extraction.vendor_name ?? "Unknown vendor"
  }
  return extraction.merchant_name ?? "Unknown merchant"
}

function totalLabel(extraction: FinancialExtraction): string {
  if (extraction.document_type === "invoice") {
    const total = extraction.invoice_total ?? "—"
    return `${extraction.currency ?? ""} ${total}`.trim()
  }
  const total = extraction.total ?? "—"
  return `${extraction.currency ?? ""} ${total}`.trim()
}

export function ProcessResultScreen({
  fileName,
  result,
  onReset,
}: ProcessResultScreenProps) {
  const { classification, extraction, validation, gl_suggestion, line_item_count } =
    result

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <p className="text-sm font-medium tracking-[0.12em] text-accent uppercase">
        Pipeline complete
      </p>
      <h1 className="mt-2 font-display text-3xl text-ink">Review snapshot</h1>
      <p className="mt-2 text-ink-muted">{fileName}</p>

      <dl className="mt-10 grid gap-6 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-ink-muted">Document type</dt>
          <dd className="mt-1 text-lg font-medium capitalize text-ink">
            {classification.document_type}{" "}
            <span className="text-sm font-normal text-ink-muted">
              ({Math.round(classification.confidence * 100)}% confidence)
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-muted">Supplier / merchant</dt>
          <dd className="mt-1 text-lg font-medium text-ink">{partyLabel(extraction)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-muted">Total</dt>
          <dd className="mt-1 text-lg font-medium text-ink">{totalLabel(extraction)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-muted">Line items</dt>
          <dd className="mt-1 text-lg font-medium text-ink">{line_item_count}</dd>
        </div>
      </dl>

      <div className="mt-10 border-t border-line pt-8">
        <h2 className="text-lg font-medium text-ink">Validation</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Totals reconcile:{" "}
          {validation.totals.reconciles === null
            ? "not enough fields"
            : validation.totals.reconciles
              ? "yes"
              : "no"}
        </p>
        {validation.issues.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-warn">
            {validation.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-accent">No validation issues reported.</p>
        )}
      </div>

      <div className="mt-10 border-t border-line pt-8">
        <h2 className="text-lg font-medium text-ink">Suggested GL account</h2>
        <p className="mt-2 text-xl font-medium text-ink">
          {gl_suggestion.account_code} — {gl_suggestion.account_name}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {gl_suggestion.rationale}
        </p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mt-12 rounded-md bg-accent px-6 py-3 text-base font-medium text-white transition hover:bg-accent-hover"
      >
        Review another document
      </button>
    </section>
  )
}
