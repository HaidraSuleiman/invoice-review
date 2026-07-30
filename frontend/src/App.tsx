import { useState } from "react"

import { FileSelectScreen } from "./components/FileSelectScreen"
import { HistoryScreen } from "./components/HistoryScreen"
import { ProcessResultScreen } from "./components/ProcessResultScreen"
import { ProcessingScreen } from "./components/ProcessingScreen"
import { WelcomeScreen } from "./components/WelcomeScreen"
import { ApiError, deleteReview, listReviews, processDocument } from "./lib/api"
import type { ProcessDocumentResponse, ReviewSummary } from "./lib/types"

type Step = "welcome" | "select" | "processing" | "result" | "history"

export default function App() {
  const [step, setStep] = useState<Step>("welcome")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [processError, setProcessError] = useState<string | null>(null)
  const [processed, setProcessed] = useState<ProcessDocumentResponse | null>(null)
  const [historyItems, setHistoryItems] = useState<ReviewSummary[] | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function resetToWelcome() {
    setStep("welcome")
    setSelectedFile(null)
    setLocalError(null)
    setProcessError(null)
    setProcessed(null)
  }

  function handleFileChange(file: File | null, error: string | null) {
    setSelectedFile(file)
    setLocalError(error)
    setProcessError(null)
  }

  async function loadHistory() {
    setHistoryError(null)
    setHistoryItems(null)
    try {
      setHistoryItems(await listReviews())
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.detail
          : error instanceof Error
            ? error.message
            : "Could not load history."
      setHistoryError(message)
      setHistoryItems([])
    }
  }

  function openHistory() {
    setStep("history")
    void loadHistory()
  }

  async function handleDeleteReview(review: ReviewSummary) {
    const confirmed = window.confirm(
      `Delete the ${review.status} review for ${review.original_filename}? This also removes the stored upload so you can demo the same sample again.`,
    )
    if (!confirmed) {
      return
    }

    setDeletingId(review.id)
    setHistoryError(null)
    try {
      await deleteReview(review.id)
      setHistoryItems((current) => (current ?? []).filter((item) => item.id !== review.id))
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.detail
          : error instanceof Error
            ? error.message
            : "Could not delete review."
      setHistoryError(message)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleProcess() {
    if (!selectedFile) {
      setLocalError("Select a document first.")
      return
    }

    setProcessError(null)
    setStep("processing")

    try {
      const response = await processDocument(selectedFile)
      setProcessed(response)
      setStep("result")
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.detail
          : error instanceof Error
            ? error.message
            : "Processing failed."
      setProcessError(message)
      setStep("select")
    }
  }

  if (step === "welcome") {
    return (
      <WelcomeScreen
        onStart={() => setStep("select")}
        onOpenHistory={openHistory}
      />
    )
  }

  if (step === "history") {
    return (
      <HistoryScreen
        reviews={historyItems}
        error={historyError}
        deletingId={deletingId}
        onBack={resetToWelcome}
        onRefresh={() => {
          void loadHistory()
        }}
        onDelete={(review) => {
          void handleDeleteReview(review)
        }}
        onStartNew={() => {
          setSelectedFile(null)
          setLocalError(null)
          setProcessError(null)
          setProcessed(null)
          setStep("select")
        }}
      />
    )
  }

  if (step === "processing" && selectedFile) {
    return <ProcessingScreen fileName={selectedFile.name} />
  }

  if (step === "result" && processed) {
    return (
      <ProcessResultScreen
        originalFilename={processed.original_filename}
        storedFilename={processed.stored_filename}
        result={processed.result}
        onReset={resetToWelcome}
        onOpenHistory={openHistory}
      />
    )
  }

  return (
    <FileSelectScreen
      selectedFile={selectedFile}
      onFileChange={handleFileChange}
      onBack={resetToWelcome}
      onProcess={() => {
        void handleProcess()
      }}
      localError={localError ?? processError}
    />
  )
}
