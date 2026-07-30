from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Fixed tutorial policy (not environment-backed).
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "data" / "uploads"
MAX_UPLOAD_BYTES = 4 * 1024 * 1024
ALLOWED_UPLOAD_SUFFIXES = frozenset({".pdf", ".png", ".jpg", ".jpeg"})
CORS_ORIGINS = ("http://localhost:5173",)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    azure_document_intelligence_endpoint: str = Field(
        validation_alias="AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT",
    )
    azure_document_intelligence_key: str = Field(
        validation_alias="AZURE_DOCUMENT_INTELLIGENCE_KEY",
    )
    azure_openai_endpoint: str = Field(
        validation_alias="AZURE_OPENAI_ENDPOINT",
    )
    azure_openai_api_key: str = Field(
        validation_alias="AZURE_OPENAI_API_KEY",
    )
