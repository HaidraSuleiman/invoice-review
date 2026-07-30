import { useEffect, useMemo } from "react"

type FilePreviewProps = {
  file: File
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) {
    return true
  }
  const name = file.name.toLowerCase()
  return name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg")
}

function isPdfFile(file: File): boolean {
  if (file.type === "application/pdf") {
    return true
  }
  return file.name.toLowerCase().endsWith(".pdf")
}

export function FilePreview({ file }: FilePreviewProps) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file])

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  if (isImageFile(file)) {
    return (
      <div className="mt-4 overflow-hidden rounded-md border border-line bg-panel">
        <img
          src={previewUrl}
          alt={`Preview of ${file.name}`}
          className="mx-auto max-h-64 w-auto object-contain p-3"
        />
      </div>
    )
  }

  if (isPdfFile(file)) {
    return (
      <div className="mt-4 overflow-hidden rounded-md border border-line bg-panel">
        <object
          data={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
          type="application/pdf"
          className="h-64 w-full"
          aria-label={`Preview of ${file.name}`}
        >
          <p className="p-4 text-sm text-ink-muted">
            PDF preview is not available in this browser. The file is still attached.
          </p>
        </object>
      </div>
    )
  }

  return null
}
