function readApiBaseUrl(): string {
  const value = import.meta.env.VITE_API_BASE_URL
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("VITE_API_BASE_URL is missing. Copy frontend/.env.example to frontend/.env.")
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`VITE_API_BASE_URL is not a valid URL: ${value}`)
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`VITE_API_BASE_URL must be http or https: ${value}`)
  }

  return parsed.toString().replace(/\/$/, "")
}

export const env = {
  apiBaseUrl: readApiBaseUrl(),
} as const
