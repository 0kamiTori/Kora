from pydantic import SecretStr
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL, Engine, make_url

from kora_api.config import Settings

SCHEMA_REVISION = "0002_consent_guard"
EXPECTED_TABLES = {
    "accounts",
    "account_credentials",
    "account_roles",
    "consent_versions",
    "account_consents",
    "registration_receipts",
}


class DatabaseConfigurationError(Exception):
    """A deliberately generic exception that never includes a connection URL."""


def postgres_url(secret: SecretStr | None, *, require_tls: bool = False) -> URL:
    if secret is None:
        raise DatabaseConfigurationError("Database connection is not configured")
    try:
        url = make_url(secret.get_secret_value())
        if url.drivername not in {"postgres", "postgresql", "postgresql+psycopg"}:
            raise ValueError
        if not url.host or not url.database:
            raise ValueError
        remote = url.host not in {"localhost", "127.0.0.1", "::1", "db"}
        if (remote or require_tls) and url.query.get("sslmode") not in {
            "require",
            "verify-ca",
            "verify-full",
        }:
            raise ValueError
        return url.set(drivername="postgresql+psycopg")
    except Exception:
        raise DatabaseConfigurationError(
            "Invalid PostgreSQL connection configuration"
        ) from None


def make_engine(url: URL, **kwargs) -> Engine:
    return create_engine(
        url,
        echo=False,
        hide_parameters=True,
        connect_args={"connect_timeout": 3, "prepare_threshold": None},
        **kwargs,
    )


class Database:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._engine: Engine | None = None

    @property
    def engine(self) -> Engine:
        if self._engine is None:
            url = postgres_url(
                self.settings.database_url, require_tls=self.settings.app_env == "pilot"
            )
            self._engine = make_engine(
                url, pool_pre_ping=True, pool_size=3, max_overflow=2, pool_timeout=3
            )
        return self._engine

    def is_ready(self) -> bool:
        try:
            with self.engine.begin() as connection:
                connection.execute(text("SET LOCAL statement_timeout = '3s'"))
                revision = connection.scalar(
                    text("SELECT version_num FROM public.kora_alembic_version")
                )
                extension = connection.scalar(
                    text(
                        "SELECT extversion FROM pg_extension WHERE extname = 'postgis'"
                    )
                )
                tables = set(
                    connection.scalars(
                        text(
                            "SELECT table_name FROM information_schema.tables "
                            "WHERE table_schema = 'kora'"
                        )
                    )
                )
                return (
                    revision == SCHEMA_REVISION
                    and extension is not None
                    and int(extension.split(".")[0]) >= 3
                    and EXPECTED_TABLES.issubset(tables)
                )
        except Exception:
            # Do not expose SQL, hostnames, passwords or driver exception messages.
            return False

    def dispose(self) -> None:
        if self._engine is not None:
            self._engine.dispose()
