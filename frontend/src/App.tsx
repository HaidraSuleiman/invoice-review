import { useState } from "react"

import { FileSelectScreen } from "./components/FileSelectScreen"
import { ProcessResultScreen } from "./components/ProcessResultScreen"
import { ProcessingScreen } from "./components/ProcessingScreen"
import { WelcomeScreen } from "./components/WelcomeScreen"
import { ApiError, processDocument } from "./lib/api"
import type { DocumentPipelineResult } from "./lib/types"

type Step = "welcome" | "select" | "processing" | "result"

export default function App() {
  const [step, setStep] = useState<Step>("welcome")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [processError, setProcessError] = useState<string | null>(null)
  const [result, setResult] = useState<DocumentPipelineResult | null>(null)

  function resetToWelcome() {
    setStep("welcome")
    setSelectedFile(null)
    setLocalError(null)
    setProcessError(null)
    setResult(null)
  }

  function handleFileChange(file: File | null, error: string | null) {
    setSelectedFile(file)
    setLocalError(error)
    setProcessError(null)
  }

  async function handleProcess() {
    if (!selectedFile) {
      setLocalError("Select a document first.")
      return
    }

    setProcessError(null)
    setStep("processing")

    try {
      const pipelineResult = await processDocument(selectedFile)
      setResult(pipelineResult)
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
    return <WelcomeScreen onStart={() => setStep("select")} />
  }

  if (step === "processing" && selectedFile) {
    return <ProcessingScreen fileName={selectedFile.name} />
  }

  if (step === "result" && result && selectedFile) {
    return (
      <ProcessResultScreen
        fileName={selectedFile.name}
        result={result}
        onReset={resetToWelcome}
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
