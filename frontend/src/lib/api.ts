import { env } from "./env"
import type {
  ProcessDocumentResponse,
  ReviewCreatePayload,
  ReviewRecord,
  ReviewSummary,
} from "./types"

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

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, init)
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

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

/** POST multipart file to the process FastAPI endpoint. */
export async function processDocument(file: File): Promise<ProcessDocumentResponse> {
  const form = new FormData()
  form.append("file", file)
  return requestJson<ProcessDocumentResponse>("/documents/process", {
    method: "POST",
    body: form,
  })
}

export async function createReview(payload: ReviewCreatePayload): Promise<ReviewRecord> {
  return requestJson<ReviewRecord>("/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function listReviews(): Promise<ReviewSummary[]> {
  return requestJson<ReviewSummary[]>("/reviews")
}

export async function deleteReview(reviewId: string): Promise<void> {
  await requestJson<undefined>(`/reviews/${reviewId}`, { method: "DELETE" })
}
