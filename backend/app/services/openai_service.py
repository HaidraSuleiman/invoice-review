"""Smoke-test Azure OpenAI Responses API using settings from the environment."""

from __future__ import annotations

from app.config import Settings
from app.providers.azure_openai import (
    DEPLOYMENT_NAME,
    create_openai_client,
    create_text_response,
    first_output_text,
)


def main() -> None:
    prompt = "What is the capital of France?"
    settings = Settings()
    client = create_openai_client(settings)
    response = create_text_response(client, input_text=prompt)

    print(f"deployment: {DEPLOYMENT_NAME}")
    print(f"prompt: {prompt!r}")
    print(f"answer: {first_output_text(response)}")


if __name__ == "__main__":
    main()
