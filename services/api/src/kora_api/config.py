from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", extra="ignore", populate_by_name=True
    )

    app_env: Literal["local", "test", "integration", "pilot"] = Field(
        default="local", validation_alias="APP_ENV"
    )
    database_url: SecretStr | None = Field(
        default=None, validation_alias="DATABASE_URL", repr=False
    )
    migration_database_url: SecretStr | None = Field(
        default=None, validation_alias="MIGRATION_DATABASE_URL", repr=False
    )
    registration_mode: Literal["disabled", "synthetic_test"] = Field(
        default="disabled", validation_alias="REGISTRATION_MODE"
    )
    registration_consent_version: str | None = Field(
        default=None, validation_alias="REGISTRATION_CONSENT_VERSION"
    )
    registration_hmac_key: SecretStr | None = Field(
        default=None, validation_alias="REGISTRATION_HMAC_KEY", repr=False
    )
    incident_directory: Path = Field(
        default=Path(".local/incidents"), validation_alias="INCIDENT_DIRECTORY"
    )
    allowed_hosts: str = Field(
        default="localhost,127.0.0.1,testserver", validation_alias="ALLOWED_HOSTS"
    )
    cors_allowed_origins: str = Field(
        default="http://localhost:5173", validation_alias="CORS_ALLOWED_ORIGINS"
    )

    @property
    def hosts(self) -> list[str]:
        return [item.strip() for item in self.allowed_hosts.split(",") if item.strip()]

    @property
    def origins(self) -> list[str]:
        return [
            item.strip()
            for item in self.cors_allowed_origins.split(",")
            if item.strip() and item.strip() != "*"
        ]
