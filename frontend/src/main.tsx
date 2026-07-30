import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"
import "./index.css"
import { env } from "./lib/env"

// Validate env at startup before mounting the UI.
void env.apiBaseUrl

const root = document.getElementById("root")
if (!root) {
  throw new Error("Root element #root not found")
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
