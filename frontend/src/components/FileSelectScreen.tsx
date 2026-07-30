import { useId, useState, type ChangeEvent, type DragEvent } from "react"

import { FilePreview } from "./FilePreview"

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

function validateFile(file: File): string | null {
  const ext = extensionOf(file.name)
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return "Choose a PDF, PNG, or JPEG file."
  }
  if (file.size === 0) {
    return "The selected file is empty."
  }
  if (file.size > MAX_BYTES) {
    return "File exceeds the 4 MB limit."
  }
  return null
}

export function FileSelectScreen({
  selectedFile,
  onFileChange,
  onBack,
  onProcess,
  localError,
}: FileSelectScreenProps) {
  const inputId = useId()
  const [isDragging, setIsDragging] = useState(false)

  function takeFile(file: File | null) {
    if (!file) {
      onFileChange(null, null)
      return
    }
    const error = validateFile(file)
    if (error) {
      onFileChange(null, error)
      return
    }
    onFileChange(file, null)
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    takeFile(file)
    // Allow selecting the same file again after a validation error.
    event.target.value = ""
  }

  function handleDragEnter(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = "copy"
    setIsDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    // Ignore leave events that stay inside the drop zone (child elements).
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return
    }
    setIsDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)

    const files = event.dataTransfer.files
    if (files.length === 0) {
      return
    }
    if (files.length > 1) {
      onFileChange(null, "Drop a single document only.")
      return
    }
    takeFile(files[0] ?? null)
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
        Drop one PDF, PNG, or JPEG here — up to 4 MB — or browse. Processing calls
        the live Azure pipeline.
      </p>

      <label
        htmlFor={inputId}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "mt-8 block rounded-md border border-dashed px-6 py-14 text-center transition",
          isDragging
            ? "border-accent bg-accent-soft scale-[1.01]"
            : "border-line bg-panel/80 hover:border-accent hover:bg-accent-soft/40",
        ].join(" ")}
      >
        <span className="block text-base font-medium text-ink">
          {isDragging
            ? "Drop to attach"
            : selectedFile
              ? "Drop a new file or click to replace"
              : "Drop a file here or click to browse"}
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
        <>
          <div className="mt-4 rounded-md border border-line bg-panel px-4 py-3 text-sm">
            <p className="font-medium text-ink">{selectedFile.name}</p>
            <p className="mt-1 text-ink-muted">{formatBytes(selectedFile.size)}</p>
          </div>
          <FilePreview file={selectedFile} />
        </>
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
