from pathlib import Path

from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest, AnalyzeResult
from azure.core.credentials import AzureKeyCredential

from app.config import Settings
from app.schemas.common.snapshot import DocumentIntelligenceSnapshot

PREBUILT_INVOICE_MODEL = "prebuilt-invoice"
PREBUILT_RECEIPT_MODEL = "prebuilt-receipt"


def create_document_intelligence_client(settings: Settings) -> DocumentIntelligenceClient:
    endpoint = settings.azure_document_intelligence_endpoint.rstrip("/") + "/"
    return DocumentIntelligenceClient(
        endpoint=endpoint,
        credential=AzureKeyCredential(settings.azure_document_intelligence_key),
    )


def analyze_document(
    client: DocumentIntelligenceClient,
    model_id: str,
    document_path: Path,
) -> AnalyzeResult:
    if not document_path.is_file():
        raise FileNotFoundError(document_path)
    poller = client.begin_analyze_document(
        model_id,
        AnalyzeDocumentRequest(bytes_source=document_path.read_bytes()),
    )
    return poller.result()


def analyze_invoice_pdf(client: DocumentIntelligenceClient, pdf_path: Path) -> AnalyzeResult:
    return analyze_document(client, PREBUILT_INVOICE_MODEL, pdf_path)


def analyze_receipt(client: DocumentIntelligenceClient, document_path: Path) -> AnalyzeResult:
    return analyze_document(client, PREBUILT_RECEIPT_MODEL, document_path)


def to_document_snapshot(result: AnalyzeResult, *, model_id: str) -> DocumentIntelligenceSnapshot:
    document = (result.documents or [None])[0]
    if document is None:
        return DocumentIntelligenceSnapshot(model_id=model_id)
    fields = {name: field.as_dict() for name, field in (document.fields or {}).items()}
    return DocumentIntelligenceSnapshot(
        model_id=model_id,
        doc_type=document.doc_type,
        confidence=document.confidence,
        fields=fields,
    )
