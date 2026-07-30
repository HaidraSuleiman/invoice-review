import { useEffect, useState } from "react"

type ProcessingScreenProps = {
  fileName: string
}

type PipelineStage = {
  id: string
  label: string
  detail: string
}

const STAGES: PipelineStage[] = [
  {
    id: "classify",
    label: "Classify document",
    detail: "Detecting invoice vs receipt",
  },
  {
    id: "extract",
    label: "Extract fields",
    detail: "Reading amounts, parties, and line items",
  },
  {
    id: "validate",
    label: "Validate finance checks",
    detail: "Checking EU VAT format and totals",
  },
  {
    id: "gl",
    label: "Suggest GL account",
    detail: "Picking from the Northstar catalog",
  },
]

/** Approximate dwell per stage while the real request is in flight (not exact). */
const STAGE_MS = 4500

export function ProcessingScreen({ fileName }: ProcessingScreenProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) =>
        current < STAGES.length - 1 ? current + 1 : current,
      )
    }, STAGE_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-[0.12em] text-accent uppercase">
        Working
      </p>
      <h1 className="mt-2 font-display text-3xl text-ink">Running pipeline</h1>
      <p className="mt-3 text-ink-muted">
        Processing{" "}
        <span className="font-medium text-ink">{fileName}</span>. Azure steps can
        take a little while — this progress is approximate.
      </p>

      <ol className="mt-10 space-y-3" aria-live="polite">
        {STAGES.map((stage, index) => {
          const status =
            index < activeIndex
              ? "done"
              : index === activeIndex
                ? "active"
                : "pending"

          return (
            <li
              key={stage.id}
              className={[
                "flex items-start gap-4 rounded-md border px-4 py-3 transition",
                status === "active"
                  ? "border-accent bg-accent-soft"
                  : status === "done"
                    ? "border-line bg-panel"
                    : "border-transparent bg-transparent opacity-55",
              ].join(" ")}
            >
              <StageMarker status={status} index={index} />
              <div className="min-w-0 flex-1">
                <p
                  className={[
                    "font-medium",
                    status === "pending" ? "text-ink-muted" : "text-ink",
                  ].join(" ")}
                >
                  {stage.label}
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">{stage.detail}</p>
              </div>
            </li>
          )
        })}
      </ol>

      <div
        className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-line"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
          style={{
            width: `${((activeIndex + 1) / STAGES.length) * 100}%`,
          }}
        />
      </div>
    </section>
  )
}

function StageMarker({
  status,
  index,
}: {
  status: "done" | "active" | "pending"
  index: number
}) {
  if (status === "done") {
    return (
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white"
        aria-label="Completed"
      >
        ✓
      </span>
    )
  }

  if (status === "active") {
    return (
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-panel"
        aria-label="In progress"
      >
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
      </span>
    )
  }

  return (
    <span
      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-xs text-ink-muted"
      aria-label="Upcoming"
    >
      {index + 1}
    </span>
  )
}
