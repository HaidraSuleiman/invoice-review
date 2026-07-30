import { env } from "./env"
import type { DocumentPipelineResult } from "./types"

export class ApiError extends Error {
  readonly status: number
  readonly detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.name = "ApiError"
    this.status = status
    this.detail = detail
  }
}

function detailFromBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("detail" in body)) {
    return null
  }
  const detail = (body as { detail: unknown }).detail
  if (typeof detail === "string") {
    return detail
  }
  return null
}

/** POST multipart file to the process-only FastAPI endpoint. */
export async function processDocument(file: File): Promise<DocumentPipelineResult> {
  const form = new FormData()
  form.append("file", file)

  let response: Response
  try {
    response = await fetch(`${env.apiBaseUrl}/documents/process`, {
      method: "POST",
      body: form,
    })
  } catch {
    throw new ApiError(
      0,
      `Could not reach the API at ${env.apiBaseUrl}. Is the backend running?`,
    )
  }

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`
    try {
      const body: unknown = await response.json()
      detail = detailFromBody(body) ?? detail
    } catch {
      // keep status-based message
    }
    throw new ApiError(response.status, detail)
  }

  return (await response.json()) as DocumentPipelineResult
}
