"""Configuración leída del entorno (archivo .env en services/api)."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _path(value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else (BASE_DIR / path).resolve()


class Settings:
    def __init__(self) -> None:
        self.database_url = os.environ.get("DATABASE_URL", "")
        self.jwt_secret = os.environ.get("JWT_SECRET", "")
        self.cors_origins = [
            origin.strip()
            for origin in os.environ.get(
                "CORS_ORIGINS", "http://localhost:5173,http://localhost:4173"
            ).split(",")
            if origin.strip()
        ]
        self.cookie_secure = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
        self.sql_dir = _path(os.environ.get("SQL_DIR", "./db"))
        self.storage_dir = _path(os.environ.get("STORAGE_DIR", "./storage"))
        self.app_env = os.environ.get("APP_ENV", "local").lower()
        # La verificación simulada es un doble de prueba: solo existe con APP_ENV=test.
        requested_mode = os.environ.get("BIOMETRIC_MODE", "pending").lower()
        self.biometric_mode = (
            "simulated" if requested_mode == "simulated" and self.app_env == "test" else "pending"
        )
        self.access_token_minutes = int(os.environ.get("ACCESS_TOKEN_MINUTES", "15"))
        self.admin_session_hours = int(os.environ.get("ADMIN_SESSION_HOURS", "12"))
        self.mobile_session_days = int(os.environ.get("MOBILE_SESSION_DAYS", "30"))

    def require(self) -> None:
        """Falla al arrancar si falta configuración indispensable."""
        if not self.database_url:
            raise RuntimeError("Falta DATABASE_URL en services/api/.env")
        if len(self.jwt_secret) < 32:
            raise RuntimeError(
                "JWT_SECRET debe tener al menos 32 caracteres. Genera uno con: "
                'python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )


settings = Settings()

API_PREFIX = "/api/v1"
# Mismos mínimos que valida el portal (src/shared/utils/validators.ts).
JUSTIFICATION_MIN_LENGTH = 15
REASON_MIN_LENGTH = 10
PASSWORD_MIN_LENGTH = 8
