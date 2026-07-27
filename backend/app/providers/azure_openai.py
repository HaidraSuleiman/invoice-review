from openai import OpenAI
from openai.types.responses import Response

from app.config import Settings

DEPLOYMENT_NAME = "gpt-5-mini"
OPENAI_V1_PATH = "/openai/v1"


def openai_base_url(endpoint: str) -> str:
    base = endpoint.strip().rstrip("/")
    if not base.endswith(OPENAI_V1_PATH):
        base = f"{base}{OPENAI_V1_PATH}"
    return base


def create_openai_client(settings: Settings) -> OpenAI:
    return OpenAI(
        base_url=openai_base_url(settings.azure_openai_endpoint),
        api_key=settings.azure_openai_api_key,
    )


def create_text_response(client: OpenAI, *, input_text: str) -> Response:
    return client.responses.create(
        model=DEPLOYMENT_NAME,
        input=input_text,
    )


def first_output_text(response: Response) -> str:
    return response.output_text or ""