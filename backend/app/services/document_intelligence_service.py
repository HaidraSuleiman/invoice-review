"""Run prebuilt-invoice analysis and print the raw Document Intelligence model."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from azure.ai.documentintelligence.models import AnalyzeResult

from app.config import Settings
from app.providers.azure_document_intelligence import (
    analyze_invoice_pdf,
    create_document_intelligence_client,
)

DEFAULT_SAMPLE = (
    Path(__file__).resolve().parents[3] / "samples" / "generated" / "01-en-happy-classic.pdf"
)


def serialize_analyze_result(result: AnalyzeResult) -> dict[str, Any]:
    return result.as_dict()


def print_field_summary(result: AnalyzeResult) -> None:
    for index, document in enumerate(result.documents or []):
        header = (
            f"--- document[{index}] doc_type={document.doc_type!r} "
            f"confidence={document.confidence} ---"
        )
        print(header)
        for name, field in (document.fields or {}).items():
            print(f"  {name}: type={field.type} content={field.content!r}")


def main() -> None:
    pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SAMPLE
    settings = Settings()
    client = create_document_intelligence_client(settings)
    result = analyze_invoice_pdf(client, pdf_path)

    print_field_summary(result)
    print("--- full analyze result (JSON) ---")
    print(json.dumps(serialize_analyze_result(result), indent=2, default=str))


if __name__ == "__main__":
    main()
