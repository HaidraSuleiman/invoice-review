import { useId, type ChangeEvent } from "react"

const ACCEPT = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg"])

type FileSelectScreenProps = {
  selectedFile: File | null
  onFileChange: (file: File | null, error: string | null) => void
  onBack: () => void
  onProcess: () => void
  localError: string | null
}

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".")
  if (dot < 0) {
    return ""
  }
  return name.slice(dot).toLowerCase()
}

export function FileSelectScreen({
  selectedFile,
  onFileChange,
  onBack,
  onProcess,
  localError,
}: FileSelectScreenProps) {
  const inputId = useId()

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (!file) {
      onFileChange(null, null)
      return
    }

    const ext = extensionOf(file.name)
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      event.target.value = ""
      onFileChange(null, "Choose a PDF, PNG, or JPEG file.")
      return
    }

    if (file.size === 0) {
      event.target.value = ""
      onFileChange(null, "The selected file is empty.")
      return
    }

    if (file.size > MAX_BYTES) {
      event.target.value = ""
      onFileChange(null, "File exceeds the 4 MB limit.")
      return
    }

    onFileChange(file, null)
  }

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-16">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 self-start text-sm font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline"
      >
        Back
      </button>

      <h1 className="font-display text-3xl text-ink">Choose a file</h1>
      <p className="mt-3 text-ink-muted">
        One PDF, PNG, or JPEG — up to 4 MB. Processing calls the live Azure pipeline.
      </p>

      <label
        htmlFor={inputId}
        className="mt-8 block rounded-md border border-dashed border-line bg-panel/80 px-6 py-10 text-center transition hover:border-accent hover:bg-accent-soft/40"
      >
        <span className="block text-base font-medium text-ink">
          {selectedFile ? "Replace file" : "Click to browse"}
        </span>
        <span className="mt-2 block text-sm text-ink-muted">PDF, PNG, or JPEG</span>
        <input
          id={inputId}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={handleChange}
        />
      </label>

      {selectedFile ? (
        <div className="mt-4 rounded-md border border-line bg-panel px-4 py-3 text-sm">
          <p className="font-medium text-ink">{selectedFile.name}</p>
          <p className="mt-1 text-ink-muted">{formatBytes(selectedFile.size)}</p>
        </div>
      ) : null}

      {localError ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {localError}
        </p>
      ) : null}

      <div className="mt-8">
        <button
          type="button"
          disabled={!selectedFile}
          onClick={onProcess}
          className="rounded-md bg-accent px-6 py-3 text-base font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          Start pipeline
        </button>
      </div>
    </section>
  )
}
