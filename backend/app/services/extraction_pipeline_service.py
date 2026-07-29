"""Run the full classify → Document Intelligence → validate extraction pipeline."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from app.config import Settings
from app.pipeline.run import run_document_pipeline
from app.providers.azure_openai import DEPLOYMENT_NAME

DEFAULT_SAMPLE = (
    Path(__file__).resolve().parents[3] / "samples" / "generated" / "01-en-happy-classic.pdf"
)


def main() -> None:
    document_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SAMPLE
    settings = Settings()
    result = run_document_pipeline(settings, document_path)

    print(f"deployment: {DEPLOYMENT_NAME}")
    print(f"file: {document_path.name}")
    print(
        json.dumps(
            {
                "classification": result.classification.model_dump(),
                "model_id": result.snapshot.model_id,
                "line_item_count": result.line_item_count,
                "extraction": result.extraction.model_dump(mode="json"),
                "validation": result.validation.model_dump(mode="json"),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
