from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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
