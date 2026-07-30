type ProcessingScreenProps = {
  fileName: string
}

export function ProcessingScreen({ fileName }: ProcessingScreenProps) {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-16">
      <h1 className="font-display text-3xl text-ink">Running pipeline</h1>
      <p className="mt-3 text-ink-muted">
        Classifying, extracting, validating, and suggesting a GL account for{" "}
        <span className="font-medium text-ink">{fileName}</span>. This can take
        half a minute while Azure responds.
      </p>
      <div
        className="mt-10 h-1.5 w-full overflow-hidden rounded-full bg-line"
        aria-hidden="true"
      >
        <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
      </div>
    </section>
  )
}
