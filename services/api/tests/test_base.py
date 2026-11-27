import json
import os
import subprocess
import sys
from pathlib import Path
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from jsonschema import Draft202012Validator, FormatChecker
from pydantic import SecretStr

from kora_api.config import Settings
from kora_api.database import DatabaseConfigurationError, postgres_url
from kora_api.main import REGISTRATION_ERROR, create_app

API_ROOT = Path(__file__).resolve().parents[1]
ROOT = API_ROOT.parents[1]


def settings(**kwargs):
    return Settings(_env_file=None, app_env="test", database_url=None, **kwargs)


def validate_contract(name, data):
    document = json.loads(
        (ROOT / "Documentación/Contratos/registration-v2.openapi.json").read_text(
            encoding="utf-8"
        )
    )
    schema = {
        "components": document["components"],
        "$ref": "#/components/schemas/" + name,
    }
    Draft202012Validator(schema, format_checker=FormatChecker()).validate(data)


def test_live_without_database_does_not_claim_ready():
    with TestClient(create_app(settings())) as client:
        response = client.get("/health/live")
        assert response.json() == {"status": "alive"}
        UUID(response.headers["X-Request-ID"])
        assert response.headers["Cache-Control"] == "no-store"
        assert client.get("/health/ready").status_code == 503


def test_policy_is_closed_even_if_operator_sets_unimplemented_flag(monkeypatch):
    monkeypatch.setenv("REGISTRATION_ENABLED", "true")
    with TestClient(create_app(settings())) as client:
        response = client.get("/api/v2/registration-policy")
        assert response.status_code == 200
        validate_contract("RegistrationPolicy", response.json())
        assert response.json()["registration_enabled"] is False
        assert response.json()["consent"] is None


@pytest.mark.parametrize("body", [b"not-json", b'{"password":"PRIVATE_VALUE"}'])
def test_closed_registration_does_not_parse_or_echo_credentials(body, caplog):
    with TestClient(create_app(settings())) as client:
        response = client.post(
            "/api/v2/accounts",
            content=body,
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 503
        validate_contract("RegistrationError", response.json())
        assert response.json()["code"] == "REGISTRATION_DISABLED"
        assert response.json()["message"] == REGISTRATION_ERROR
        assert response.json()["request_id"] == response.headers["X-Request-ID"]
        assert "PRIVATE_VALUE" not in response.text + caplog.text


def test_unexpected_error_is_sanitized(caplog):
    app = create_app(settings())

    @app.get("/only-in-test")
    def failure():
        raise RuntimeError("PRIVATE_CONNECTION_VALUE")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/only-in-test")
        assert response.status_code == 500
        validate_contract("RegistrationError", response.json())
        assert "PRIVATE_CONNECTION_VALUE" not in response.text + caplog.text
        assert "event=unhandled_error" in caplog.text


def test_cors_and_hosts_are_explicit():
    with TestClient(create_app(settings())) as client:
        assert (
            client.get(
                "/health/live", headers={"Host": "untrusted.invalid"}
            ).status_code
            == 400
        )
        assert (
            "access-control-allow-origin"
            not in client.get(
                "/health/live", headers={"Origin": "https://untrusted.invalid"}
            ).headers
        )
        assert (
            client.get(
                "/health/live", headers={"Origin": "http://localhost:5173"}
            ).headers["access-control-allow-origin"]
            == "http://localhost:5173"
        )


@pytest.mark.parametrize(
    "url",
    [
        "sqlite:///test.db",
        "not-a-url-PRIVATE_VALUE",
        "postgresql://owner:PRIVATE_VALUE@remote.invalid/neondb",
    ],
)
def test_reject_wrong_database_or_remote_connection_without_tls(url):
    with pytest.raises(DatabaseConfigurationError) as error:
        postgres_url(SecretStr(url))
    assert "PRIVATE_VALUE" not in str(error.value)


def test_accept_neon_style_url_without_disclosing_it():
    raw = "postgresql://owner:PRIVATE_VALUE@remote.invalid/neondb?sslmode=require&channel_binding=require"
    value = postgres_url(SecretStr(raw))
    assert value.drivername == "postgresql+psycopg"
    assert value.query["channel_binding"] == "require"
    assert "PRIVATE_VALUE" not in repr(Settings(_env_file=None, database_url=raw))


def test_docs_disabled_for_pilot():
    with TestClient(
        create_app(Settings(_env_file=None, app_env="pilot", database_url=None))
    ) as client:
        assert client.get("/docs").status_code == 404
        assert client.get("/openapi.json").status_code == 404


def test_offline_migration_generates_sql_without_connecting():
    result = subprocess.run(
        [sys.executable, "-m", "kora_api.migrate", "upgrade", "--sql"],
        cwd=API_ROOT,
        text=True,
        capture_output=True,
        timeout=20,
    )
    assert result.returncode == 0, result.stderr
    assert "CREATE TABLE kora.accounts" in result.stdout
    assert "CREATE EXTENSION IF NOT EXISTS postgis" in result.stdout
    assert "CREATE TRIGGER protect_approved_consent" in result.stdout


def test_migration_failure_does_not_print_connection_secret():
    env = {
        **os.environ,
        "MIGRATION_DATABASE_URL": "postgresql://owner:PRIVATE_MIGRATION_VALUE@127.0.0.1:1/kora_test_none",
    }
    result = subprocess.run(
        [sys.executable, "-m", "kora_api.migrate", "upgrade"],
        cwd=API_ROOT,
        env=env,
        text=True,
        capture_output=True,
        timeout=20,
    )
    assert result.returncode == 1
    assert "Migration failed" in result.stderr
    assert "PRIVATE_MIGRATION_VALUE" not in result.stdout + result.stderr
    assert "Traceback" not in result.stderr
