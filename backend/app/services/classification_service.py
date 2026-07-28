"""Smoke-test invoice vs receipt classification on a sample document."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from app.config import Settings
from app.pipeline.classification import classify_document
from app.providers.azure_openai import DEPLOYMENT_NAME

DEFAULT_SAMPLE = (
    Path(__file__).resolve().parents[3] / "samples" / "generated" / "01-en-happy-classic.pdf"
)


def main() -> None:
    document_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SAMPLE
    settings = Settings()
    classification = classify_document(settings, document_path)

    print(f"deployment: {DEPLOYMENT_NAME}")
    print(f"file: {document_path.name}")
    print(json.dumps(classification.model_dump(), indent=2))


if __name__ == "__main__":
    main()
