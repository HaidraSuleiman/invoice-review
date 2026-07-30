import type { ReviewStatus, ReviewSummary } from "../lib/types"

type HistoryScreenProps = {
  reviews: ReviewSummary[] | null
  error: string | null
  deletingId: string | null
  onBack: () => void
  onStartNew: () => void
  onRefresh: () => void
  onDelete: (review: ReviewSummary) => void
}

export function HistoryScreen({
  reviews,
  error,
  deletingId,
  onBack,
  onStartNew,
  onRefresh,
  onDelete,
}: HistoryScreenProps) {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16 sm:px-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 text-sm font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline"
      >
        Back
      </button>

      <p className="text-sm font-medium tracking-[0.12em] text-accent uppercase">
        Local history
      </p>
      <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">Review decisions</h1>
      <p className="mt-3 max-w-xl text-ink-muted">
        Accepted and rejected documents saved in SQLite on this machine. Delete a row to
        clear it and its uploaded file.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onStartNew}
          className="rounded-md bg-accent px-6 py-3 text-base font-medium text-white transition hover:bg-accent-hover"
        >
          Review a document
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md border border-line bg-panel px-6 py-3 text-base font-medium text-ink transition hover:border-accent"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="mt-6 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {reviews === null ? (
        <p className="mt-10 text-ink-muted">Loading history…</p>
      ) : reviews.length === 0 ? (
        <p className="mt-10 border-t border-line pt-8 text-ink-muted">
          No decisions saved yet. Accept or reject a document after processing to see it
          here.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={review.status} />
                  <span className="text-sm capitalize text-ink-muted">
                    {review.document_type}
                  </span>
                </div>
                <p className="mt-2 font-medium text-ink">{review.party_name || "—"}</p>
                <p className="mt-1 truncate text-sm text-ink-muted">
                  {review.original_filename}
                </p>
                <p className="mt-2 text-sm text-ink-muted">
                  {formatMoney(review.currency, review.total)}
                  {review.document_number ? ` · #${review.document_number}` : ""}
                  {review.gl_account_code ? ` · GL ${review.gl_account_code}` : ""}
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {formatDecidedAt(review.decided_at)}
                </p>
              </div>
              <button
                type="button"
                disabled={deletingId === review.id}
                onClick={() => {
                  onDelete(review)
                }}
                className="shrink-0 self-start rounded-md border border-danger/30 px-4 py-2 text-sm font-medium text-danger transition hover:border-danger disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deletingId === review.id ? "Deleting…" : "Delete"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const isAccepted = status === "accepted"
  return (
    <span
      className={[
        "text-xs font-semibold tracking-[0.08em] uppercase",
        isAccepted ? "text-accent" : "text-danger",
      ].join(" ")}
    >
      {status}
    </span>
  )
}

function formatMoney(currency: string | null, total: string | null): string {
  if (!total) {
    return "No total"
  }
  return currency ? `${currency} ${total}` : total
}

function formatDecidedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}
