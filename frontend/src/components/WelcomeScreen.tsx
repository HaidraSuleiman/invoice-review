type WelcomeScreenProps = {
  onStart: () => void
  onOpenHistory: () => void
}

export function WelcomeScreen({ onStart, onOpenHistory }: WelcomeScreenProps) {
  return (
    <section className="flex min-h-screen flex-col justify-center px-6 py-16 sm:px-10">
      <div className="mx-auto w-full max-w-3xl">
        <p className="mb-4 text-sm font-medium tracking-[0.14em] text-accent uppercase">
          Northstar Facilities B.V.
        </p>
        <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
          Document Review
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">
          Upload a supplier invoice or expense receipt. We classify it, extract the
          fields, check VAT and totals, and suggest a GL account.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onStart}
            className="rounded-md bg-accent px-6 py-3 text-base font-medium text-white transition hover:bg-accent-hover"
          >
            Select a document
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            className="rounded-md border border-line bg-panel px-6 py-3 text-base font-medium text-ink transition hover:border-accent"
          >
            View history
          </button>
        </div>
      </div>
    </section>
  )
}
