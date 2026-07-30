from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Fixed tutorial policy (not environment-backed).
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
DATABASE_PATH = DATA_DIR / "reviews.db"
MAX_UPLOAD_BYTES = 4 * 1024 * 1024
ALLOWED_UPLOAD_SUFFIXES = frozenset({".pdf", ".png", ".jpg", ".jpeg"})
CORS_ORIGINS = ("http://localhost:5173",)


class RuntimePaths(BaseSettings):
    """Optional deploy paths. Unset locally so the API stays API-only."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    static_dir: Path | None = Field(default=None, validation_alias="STATIC_DIR")


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
