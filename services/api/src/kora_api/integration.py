"""Explicit synthetic integration setup. Never reads the ordinary Neon .env."""

import argparse
import hashlib
import os
import secrets
from datetime import datetime, timezone
from pathlib import Path

import psycopg
import sqlalchemy as sa
from alembic import command
from dotenv import dotenv_values
from psycopg import sql
from sqlalchemy.engine import URL, make_url

from kora_api.config import Settings
from kora_api.database import make_engine, postgres_url
from kora_api.main import create_app
from kora_api.migrate import migration_config
from kora_api.models import ConsentVersion

API_ROOT = Path(__file__).resolve().parents[2]
CONFIG = API_ROOT / ".local/integration/connection.env"
CONSENT = "test-mobile-account-v1"
TEXT = "PRUEBA SINTÉTICA DE KÖRA. Acepto crear una cuenta ficticia para comprobar el registro. No usar datos personales reales. Este texto no autoriza captura biométrica ni constituye consentimiento para participantes."


def initialize():
    if CONFIG.exists():
        load_settings()
        print("Existing isolated integration configuration preserved.")
        return
    operator_password, runtime_password = (
        secrets.token_urlsafe(36),
        secrets.token_urlsafe(36),
    )

    def uri(role, password):
        return URL.create(
            "postgresql",
            username=role,
            password=password,
            host="127.0.0.1",
            port=55433,
            database="kora_test_mobile",
        ).render_as_string(hide_password=False)

    values = {
        "APP_ENV": "test",
        "REGISTRATION_MODE": "synthetic_test",
        "DATABASE_URL": uri("kora_test_mobile_app", runtime_password),
        "MIGRATION_DATABASE_URL": uri("kora_test_mobile_operator", operator_password),
        "KORA_TEST_DB_PASSWORD": operator_password,
        "REGISTRATION_CONSENT_VERSION": CONSENT,
        "REGISTRATION_HMAC_KEY": secrets.token_urlsafe(48),
        "INCIDENT_DIRECTORY": str(API_ROOT / ".local/integration/incidents").replace(
            "\\", "/"
        ),
        "ALLOWED_HOSTS": "127.0.0.1,localhost",
        "CORS_ALLOWED_ORIGINS": "http://localhost:5173",
    }
    CONFIG.parent.mkdir(parents=True, exist_ok=True)
    with CONFIG.open("x", encoding="utf-8") as stream:
        stream.write(
            "\n".join(key + '="' + value + '"' for key, value in values.items()) + "\n"
        )
    print("Isolated configuration generated. No Neon settings changed.")


def load_settings():
    values = dotenv_values(CONFIG)
    required = {
        "APP_ENV",
        "DATABASE_URL",
        "MIGRATION_DATABASE_URL",
        "REGISTRATION_MODE",
        "REGISTRATION_CONSENT_VERSION",
        "REGISTRATION_HMAC_KEY",
        "INCIDENT_DIRECTORY",
        "ALLOWED_HOSTS",
        "CORS_ALLOWED_ORIGINS",
        "KORA_TEST_DB_PASSWORD",
    }
    if not required.issubset(values) or any(not values[key] for key in required):
        raise ValueError("Incomplete isolated integration configuration")
    settings = Settings(_env_file=None, **values)
    if (
        settings.app_env != "test"
        or settings.registration_mode != "synthetic_test"
        or settings.registration_consent_version != CONSENT
        or len(settings.registration_hmac_key.get_secret_value()) < 32
    ):
        raise ValueError("Not the synthetic integration environment")
    for secret, role in [
        (settings.database_url, "kora_test_mobile_app"),
        (settings.migration_database_url, "kora_test_mobile_operator"),
    ]:
        url = postgres_url(secret)
        if (
            url.host != "127.0.0.1"
            or url.port != 55433
            or url.database != "kora_test_mobile"
            or url.username != role
        ):
            raise ValueError("Refusing a non-isolated database target")
    if (
        make_url(settings.migration_database_url.get_secret_value()).password
        != values["KORA_TEST_DB_PASSWORD"]
    ):
        raise ValueError("Operator credentials disagree")
    return settings


def prepare():
    settings = load_settings()
    # Alembic reads Settings(): override only within this guarded CLI invocation,
    # preserving the ordinary local .env and restoring the process environment.
    overrides = {
        "APP_ENV": "test",
        "DATABASE_URL": settings.database_url.get_secret_value(),
        "MIGRATION_DATABASE_URL": settings.migration_database_url.get_secret_value(),
    }
    previous = {key: os.environ.get(key) for key in overrides}
    try:
        os.environ.update(overrides)
        command.upgrade(migration_config(), "head")
        command.check(migration_config())
    finally:
        for key, value in previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
    runtime = make_url(settings.database_url.get_secret_value())
    operator = make_url(settings.migration_database_url.get_secret_value())
    with psycopg.connect(
        operator.render_as_string(hide_password=False), connect_timeout=5
    ) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='kora_test_mobile_app')"
            )
            if not cursor.fetchone()[0]:
                cursor.execute(
                    sql.SQL(
                        "CREATE ROLE kora_test_mobile_app LOGIN PASSWORD {} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS"
                    ).format(sql.Literal(runtime.password))
                )
            cursor.execute(
                "REVOKE CONNECT, TEMPORARY ON DATABASE kora_test_mobile FROM PUBLIC"
            )
            cursor.execute(
                "GRANT CONNECT ON DATABASE kora_test_mobile TO kora_test_mobile_app"
            )
            cursor.execute("GRANT USAGE ON SCHEMA kora TO kora_test_mobile_app")
            cursor.execute(
                "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA kora TO kora_test_mobile_app"
            )
            cursor.execute(
                "REVOKE INSERT, UPDATE, DELETE ON kora.consent_versions FROM kora_test_mobile_app"
            )
            cursor.execute(
                "GRANT SELECT ON public.kora_alembic_version TO kora_test_mobile_app"
            )
            cursor.execute(
                "GRANT EXECUTE ON FUNCTION kora.require_approved_consent() TO kora_test_mobile_app"
            )
    engine = make_engine(postgres_url(settings.migration_database_url))
    try:
        with engine.begin() as connection:
            existing = connection.execute(
                sa.select(ConsentVersion.body, ConsentVersion.state).where(
                    ConsentVersion.version == CONSENT
                )
            ).first()
            if existing is None:
                connection.execute(
                    sa.insert(ConsentVersion).values(
                        version=CONSENT,
                        body=TEXT,
                        content_sha256=hashlib.sha256(TEXT.encode()).digest(),
                        state="approved",
                        approved_at=datetime.now(timezone.utc),
                    )
                )
            elif existing.body != TEXT or existing.state != "approved":
                raise ValueError("Existing test policy differs; no content overwritten")
    finally:
        engine.dispose()
    print(
        "Local schema and synthetic policy prepared; no accounts seeded. Runtime role separated."
    )


def create_integration_app():
    return create_app(load_settings())


def main():
    parser = argparse.ArgumentParser(description="Köra isolated synthetic integration")
    parser.add_argument("action", choices=["init", "prepare", "status"])
    args = parser.parse_args()
    try:
        if args.action == "init":
            initialize()
        elif args.action == "prepare":
            prepare()
        else:
            app = create_integration_app()
            try:
                ready = app.state.database.is_ready()
                print(
                    "Integration database ready."
                    if ready
                    else "Integration database not ready."
                )
                return 0 if ready else 1
            finally:
                app.state.database.dispose()
        return 0
    except Exception as error:
        print(
            "Integration operation failed; error_type="
            + type(error).__name__
            + ". Check local prerequisites/configuration. Credentials are not displayed."
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
