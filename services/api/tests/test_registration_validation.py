import json
from datetime import date
from pathlib import Path
from uuid import uuid4

import pytest
from argon2.exceptions import VerifyMismatchError
from fastapi.testclient import TestClient

from kora_api.config import Settings
from kora_api.main import create_app
from kora_api.registration import HASHER
from kora_api.registration_errors import MESSAGES, RegistrationError
from kora_api.registration_validation import validate_registration

TODAY = date(2026, 11, 26)


def payload(**changes):
    return {
        "email": "cuenta01@kora.example.invalid",
        "password": "PruebaKora2026!",
        "display_name": "Juliana Prueba",
        "birth_date": "2000-01-01",
        "phone": {"country_calling_code": "+57", "national_number": "3015550100"},
        "requested_role": "passenger",
        "consent": {"accepted": True, "version": "test-account-consent-v1"},
        **changes,
    }


def synthetic_settings(tmp_path, **changes):
    values = dict(
        _env_file=None,
        app_env="test",
        database_url="postgresql://test:synthetic@127.0.0.1:1/kora_test_registration",
        registration_mode="synthetic_test",
        registration_consent_version="test-account-consent-v1",
        registration_hmac_key="synthetic-test-key-with-at-least-32-bytes",
        incident_directory=tmp_path,
    )
    values.update(changes)
    return Settings(**values)


def test_messages_match_target_contract():
    document = json.loads(
        (
            Path(__file__).resolve().parents[3]
            / "Documentación/Contratos/registration-v2.openapi.json"
        ).read_text(encoding="utf-8")
    )
    for code, expected in document["x-error-codes"].items():
        assert MESSAGES[code] == (expected["http_status"], expected["message"])


@pytest.mark.parametrize(
    ("changes", "code"),
    [
        ({"email": ""}, "REQUIRED_FIELDS_MISSING"),
        ({"consent": {"accepted": False, "version": "test-v1"}}, "CONSENT_REQUIRED"),
        ({"email": "bad@@example.invalid"}, "CONTACT_INVALID"),
        (
            {
                "phone": {
                    "country_calling_code": "+999",
                    "national_number": "3015550100",
                }
            },
            "CONTACT_INVALID",
        ),
        (
            {"phone": {"country_calling_code": "+57", "national_number": "123"}},
            "CONTACT_INVALID",
        ),
        ({"password": "NoNumbersHere!"}, "PASSWORD_INVALID"),
        ({"password": "nocapitals2026!"}, "PASSWORD_INVALID"),
        ({"password": "NOLOWERCASE26!"}, "PASSWORD_INVALID"),
        ({"password": "NoSpecial2026 "}, "PASSWORD_INVALID"),
        ({"password": "Abcdefg123!"}, "PASSWORD_INVALID"),
        ({"display_name": "Juli@na"}, "DISPLAY_NAME_INVALID"),
        ({"display_name": "a" * 101}, "DISPLAY_NAME_INVALID"),
        ({"birth_date": "2000-02-30"}, "BIRTH_DATE_INVALID"),
        ({"birth_date": "2026-11-27"}, "BIRTH_DATE_INVALID"),
        ({"birth_date": "2008-11-27"}, "AGE_RESTRICTED"),
        ({"requested_role": "admin"}, "VALIDATION_ERROR"),
        ({"roles": ["admin"]}, "VALIDATION_ERROR"),
        ({"email": "somebody@example.com"}, "VALIDATION_ERROR"),
    ],
)
def test_validation_rejects_invalid_fields(changes, code):
    with pytest.raises(RegistrationError) as error:
        validate_registration(payload(**changes), TODAY)
    assert error.value.code == code
    assert error.value.fields


def test_required_fields_also_identify_missing_consent():
    body = payload(email="", consent=None)
    with pytest.raises(RegistrationError) as error:
        validate_registration(body, TODAY)
    assert error.value.code == "REQUIRED_FIELDS_MISSING"
    assert ("consent", "CONSENT_REQUIRED") in error.value.fields


def test_normalization_preserves_password_name_spaces_and_provider_suffix():
    password = " Abcdéfgh123! "
    result = validate_registration(
        payload(
            email="  JULI.ANA+tag@Example.invalid  ",
            display_name="  Julia\u0301na  Ñuñez 20  ",
            password=password,
            birth_date="2008-11-26",
            phone={"country_calling_code": "+57", "national_number": "(301) 555-0100"},
        ),
        TODAY,
    )
    assert result.email == "juli.ana+tag@example.invalid"
    assert result.display_name == "Juliána  Ñuñez 20"
    assert result.phone_e164 == "+573015550100"
    assert result.password == password
    assert password not in repr(result)


def test_leap_day_turns_18_on_march_1_non_leap_year():
    body = payload(birth_date="2008-02-29")
    with pytest.raises(RegistrationError, match="AGE_RESTRICTED"):
        validate_registration(body, date(2026, 2, 28))
    validate_registration(body, date(2026, 3, 1))


def test_same_national_number_different_valid_calling_codes():
    co = validate_registration(payload(), TODAY)
    us = validate_registration(
        payload(phone={"country_calling_code": "+1", "national_number": "3015550100"}),
        TODAY,
    )
    assert co.phone_e164 != us.phone_e164


def test_argon2id_protects_and_verifies_exact_password():
    password = " PruebaKora2026! "
    one, two = HASHER.hash(password), HASHER.hash(password)
    assert one.startswith("$argon2id$") and one != two
    assert HASHER.verify(one, password)
    with pytest.raises(VerifyMismatchError):
        HASHER.verify(one, password.strip())


@pytest.mark.parametrize(
    "changes",
    [
        {"app_env": "local"},
        {"app_env": "pilot"},
        {
            "database_url": "postgresql://owner:synthetic@remote.invalid/kora_dev?sslmode=require"
        },
        {"database_url": "postgresql://owner:synthetic@localhost/neondb"},
        {"registration_hmac_key": "short"},
        {"registration_consent_version": "real-v1"},
    ],
)
def test_synthetic_mode_cannot_enable_non_test_environments(tmp_path, changes):
    with TestClient(create_app(synthetic_settings(tmp_path, **changes))) as client:
        assert (
            client.get("/api/v2/registration-policy").json()["registration_enabled"]
            is False
        )
        assert (
            client.post("/api/v2/accounts", json=payload()).json()["code"]
            == "REGISTRATION_DISABLED"
        )


@pytest.mark.parametrize(
    ("body", "media", "code"),
    [
        (b"not-json", "application/json", "REQUEST_INVALID"),
        (b'{"email":"x","email":"y"}', "application/json", "REQUEST_INVALID"),
        (b'{"x":NaN}', "application/json", "REQUEST_INVALID"),
        (b'{"password":"\\ud800"}', "application/json", "REQUEST_INVALID"),
        (b"x" * 16385, "application/json", "BODY_TOO_LARGE"),
        (b"{}", "text/plain", "UNSUPPORTED_MEDIA_TYPE"),
    ],
)
def test_protocol_errors_are_controlled_without_database(tmp_path, body, media, code):
    with TestClient(create_app(synthetic_settings(tmp_path))) as client:
        response = client.post(
            "/api/v2/accounts",
            content=body,
            headers={"Content-Type": media, "Idempotency-Key": str(uuid4())},
        )
        assert response.json()["code"] == code
        assert response.status_code == MESSAGES[code][0]


def test_missing_idempotency_header_and_local_rate_limit(tmp_path):
    with TestClient(create_app(synthetic_settings(tmp_path))) as client:
        for _ in range(10):
            assert (
                client.post("/api/v2/accounts", json=payload()).json()["code"]
                == "REQUEST_INVALID"
            )
        response = client.post("/api/v2/accounts", json=payload())
        assert response.status_code == 429
        assert response.headers["Retry-After"] == "60"


def test_database_outage_generates_independent_sanitized_incident(tmp_path, caplog):
    with TestClient(create_app(synthetic_settings(tmp_path))) as client:
        response = client.post(
            "/api/v2/accounts",
            json=payload(),
            headers={"Idempotency-Key": str(uuid4())},
        )
        assert response.status_code == 503
        assert response.json()["code"] == "DATABASE_UNAVAILABLE"
        incident = json.loads((tmp_path / "registration.jsonl").read_text())
        assert incident["incident_id"] == response.json()["incident_id"]
        assert incident["delivery_status"] == "pending_channel"
        text = response.text + caplog.text + json.dumps(incident)
        assert "PruebaKora2026!" not in text
        assert "cuenta01@kora.example.invalid" not in text
        assert "postgresql://" not in text
