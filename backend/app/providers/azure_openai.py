from openai import OpenAI
from openai.types.responses import Response

from app.config import Settings

DEPLOYMENT_NAME = "gpt-5-mini"


def azure_openai_base_url(settings: Settings) -> str:
    return settings.azure_openai_endpoint.rstrip("/")


def create_openai_client(settings: Settings) -> OpenAI:
    return OpenAI(
        base_url=azure_openai_base_url(settings),
        api_key=settings.azure_openai_api_key,
    )


def create_text_response(client: OpenAI, *, input_text: str) -> Response:
    return client.responses.create(
        model=DEPLOYMENT_NAME,
        input=input_text,
    )


def first_output_text(response: Response) -> str:
    return response.output_text or ""
