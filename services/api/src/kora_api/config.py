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
