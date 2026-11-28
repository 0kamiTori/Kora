import hashlib
import json
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Barrier
from uuid import UUID, uuid4

import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from test_base import validate_contract
from test_registration_validation import payload, synthetic_settings

from kora_api.main import create_app
from kora_api.models import (
    Account,
    AccountConsent,
    AccountCredential,
    AccountRole,
    ConsentVersion,
    RegistrationReceipt,
)
from kora_api.registration import HASHER

pytestmark = pytest.mark.postgres


@pytest.fixture
def registered(postgres_engine, tmp_path):
    namespace = "test-reg-" + uuid4().hex
    version = namespace + "-v1"
    fixed = datetime(2026, 11, 26, 12, tzinfo=timezone.utc)

    def policy(name, state="approved"):
        body = "Consentimiento sintético exclusivo de pruebas aisladas."
        with postgres_engine.begin() as connection:
            connection.execute(
                sa.insert(ConsentVersion).values(
                    version=name,
                    body=body,
                    content_sha256=hashlib.sha256(body.encode()).digest(),
                    state=state,
                    approved_at=fixed - timedelta(days=1)
                    if state == "approved"
                    else None,
                )
            )

    policy(version)
    # Use the guarded test engine's URL; never read the project's Neon .env.
    settings = synthetic_settings(
        tmp_path,
        database_url=postgres_engine.url.render_as_string(hide_password=False),
        registration_consent_version=version,
    )
    app = create_app(settings)
    service = app.state.registration
    service.clock = lambda: fixed

    def data(**changes):
        return payload(
            email="one@" + namespace + ".invalid",
            consent={"accepted": True, "version": version},
            **changes,
        )

    with TestClient(app, raise_server_exceptions=False) as client:
        try:
            yield client, service, data, policy, postgres_engine, tmp_path
        finally:
            # Cleanup is confined to this fixture's namespace on the guarded
            # disposable local PostgreSQL. No Neon, global TRUNCATE or CASCADE.
            with postgres_engine.begin() as connection:
                ids = list(
                    connection.scalars(
                        sa.select(Account.id).where(
                            Account.email_canonical.like("%@" + namespace + ".invalid")
                        )
                    )
                )
                for model in (
                    RegistrationReceipt,
                    AccountConsent,
                    AccountCredential,
                    AccountRole,
                ):
                    connection.execute(
                        sa.delete(model).where(model.account_id.in_(ids))
                    )
                connection.execute(sa.delete(Account).where(Account.id.in_(ids)))
                connection.execute(
                    sa.delete(ConsentVersion).where(
                        ConsentVersion.version.like(namespace + "%")
                    )
                )


def post(client, body, key=None):
    return client.post(
        "/api/v2/accounts", json=body, headers={"Idempotency-Key": str(key or uuid4())}
    )


def test_reg01_atomic_account_hash_consent_and_intent(registered):
    client, service, data, _, engine, _ = registered
    body = data(requested_role="driver")
    response = post(client, body)
    assert response.status_code == 201, response.text
    validate_contract("AccountCreatedV2", response.json())
    assert response.headers["Idempotency-Replayed"] == "false"
    result = response.json()
    assert result["roles"] == ["passenger"] and result["driver_approved"] is False
    assert result["driver_review_status"] == "not_submitted"
    identifier = UUID(result["id"])
    with engine.connect() as c:
        assert (
            c.scalar(
                sa.select(Account.onboarding_intent).where(Account.id == identifier)
            )
            == "driver"
        )
        stored = c.scalar(
            sa.select(AccountCredential.password_hash).where(
                AccountCredential.account_id == identifier
            )
        )
        assert HASHER.verify(stored, body["password"])
        assert list(
            c.scalars(
                sa.select(AccountRole.role).where(AccountRole.account_id == identifier)
            )
        ) == ["passenger"]
        assert (
            c.scalar(
                sa.select(AccountConsent.consent_version).where(
                    AccountConsent.account_id == identifier
                )
            )
            == service.settings.registration_consent_version
        )
        assert (
            c.scalar(
                sa.select(sa.func.count())
                .select_from(RegistrationReceipt)
                .where(RegistrationReceipt.account_id == identifier)
            )
            == 1
        )
    for forbidden in ("password", "email", "phone", "access_token", "refresh_token"):
        assert forbidden not in result


def test_reg02_changed_and_missing_consent_write_nothing(registered):
    client, _, data, _, _, _ = registered
    body = data()
    body["consent"]["version"] = "test-obsolete"
    assert post(client, body).json()["code"] == "CONSENT_VERSION_CHANGED"
    body["consent"]["accepted"] = False
    assert post(client, body).json()["code"] == "CONSENT_REQUIRED"


@pytest.mark.parametrize(
    ("birth", "code"),
    [
        ("2008-11-27", "AGE_RESTRICTED"),
        ("2027-01-01", "BIRTH_DATE_INVALID"),
        ("2000-02-30", "BIRTH_DATE_INVALID"),
    ],
)
def test_reg03_server_rejects_age_and_invalid_dates(registered, birth, code):
    client, _, data, _, _, _ = registered
    assert post(client, data(birth_date=birth)).json()["code"] == code


def test_reg03_exact_eighteenth_birthday_uses_colombia_date(registered):
    client, service, data, _, _, _ = registered
    service.clock = lambda: datetime(2026, 11, 27, 2, tzinfo=timezone.utc)
    assert (
        post(client, data(birth_date="2008-11-27")).json()["code"] == "AGE_RESTRICTED"
    )
    assert post(client, data(birth_date="2008-11-26")).status_code == 201


@pytest.mark.parametrize("same", ["email", "phone"])
def test_reg04_concurrent_contact_uniqueness(registered, same):
    client, _, data, _, engine, _ = registered
    one, two = data(), data()
    if same == "email":
        two["email"] = two["email"].upper()
        two["phone"]["national_number"] = "3110000000"
    else:
        two["email"] = two["email"].replace("one@", "two@")
        two["phone"]["national_number"] = "(301) 555-0100"
    barrier = Barrier(2)

    def send(body):
        barrier.wait(timeout=10)
        return post(client, body)

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(send, [one, two]))
    assert sorted(r.status_code for r in results) == [201, 409], [
        r.text for r in results
    ]
    assert (
        next(r for r in results if r.status_code == 409).json()["code"]
        == "CONTACT_NOT_AVAILABLE"
    )


def test_reg05_shared_name_and_different_country_codes(registered):
    client, _, data, _, _, _ = registered
    one = data()
    two = deepcopy(one)
    two["email"] = two["email"].replace("one@", "two@")
    two["phone"]["country_calling_code"] = "+1"
    assert post(client, one).status_code == 201
    assert post(client, two).status_code == 201


def test_reg06_concurrent_idempotency_and_equivalent_replay(registered):
    client, _, data, _, _, _ = registered
    body, key, barrier = data(), uuid4(), Barrier(2)

    def send(_):
        barrier.wait(timeout=10)
        return post(client, body, key)

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(send, [0, 1]))
    assert any(r.status_code == 201 for r in responses), [r.text for r in responses]
    for response in responses:
        assert (
            response.status_code == 201
            or response.json()["code"] == "REGISTRATION_IN_PROGRESS"
        )
    created = next(r.json() for r in responses if r.status_code == 201)
    equivalent = deepcopy(body)
    equivalent["email"] = "  " + body["email"].upper() + "  "
    equivalent["display_name"] = " " + body["display_name"] + " "
    equivalent["phone"]["national_number"] = "(301) 555-0100"
    replay = post(client, equivalent, key)
    assert replay.status_code == 201 and replay.json() == created
    assert replay.headers["Idempotency-Replayed"] == "true"


def test_reg06_in_progress_lock_returns_retry_then_allows_same_key(registered):
    client, _, data, _, engine, _ = registered
    key = uuid4()
    lock_id = int.from_bytes(
        hashlib.sha256(b"kora:registration:" + key.bytes).digest()[:8],
        "big",
        signed=True,
    )
    with engine.begin() as connection:
        connection.execute(
            sa.text("SELECT pg_advisory_xact_lock(:key)"), {"key": lock_id}
        )
        response = post(client, data(), key)
        assert response.status_code == 409
        assert response.json()["code"] == "REGISTRATION_IN_PROGRESS"
        assert response.headers["Retry-After"] == "2"
    assert post(client, data(), key).status_code == 201


def test_reg07_changed_content_and_expired_key_never_create_again(registered):
    client, service, data, _, _, _ = registered
    body, key = data(), uuid4()
    assert post(client, body, key).status_code == 201
    assert (
        post(client, {**body, "display_name": "Otro Nombre"}, key).json()["code"]
        == "IDEMPOTENCY_CONFLICT"
    )
    now = service.clock()
    service.clock = lambda: now + timedelta(hours=24, seconds=1)
    assert post(client, body, key).json()["code"] == "IDEMPOTENCY_CONFLICT"


def test_reg08_lost_response_replays_after_policy_changed_or_closed(registered):
    client, service, data, policy, _, _ = registered
    body, key = data(), uuid4()
    first = post(client, body, key)
    newer = service.settings.registration_consent_version + "-v2"
    policy(newer)
    service.settings.registration_consent_version = newer
    assert (
        client.get("/api/v2/registration-policy").json()["consent"]["version"] == newer
    )
    replay = post(client, body, key)
    assert replay.status_code == 201 and replay.json() == first.json()
    service.settings.registration_consent_version = "test-not-approved"
    assert (
        client.get("/api/v2/registration-policy").json()["registration_enabled"]
        is False
    )
    assert post(client, body, key).json() == first.json()
    assert post(client, body).json()["code"] == "REGISTRATION_DISABLED"


def test_reg09_failure_after_account_insert_rolls_back_and_spools_incident(
    registered, caplog
):
    client, _, data, _, engine, directory = registered
    body = data()

    def fail(connection, cursor, statement, parameters, context, executemany):
        if "INSERT INTO kora.account_consents" in statement:
            raise RuntimeError("PRIVATE_SQL_PRIVATE_PASSWORD")

    app_engine = client.app.state.database.engine
    sa.event.listen(app_engine, "before_cursor_execute", fail)
    try:
        response = post(client, body)
    finally:
        sa.event.remove(app_engine, "before_cursor_execute", fail)
    assert response.status_code == 500
    validate_contract("RegistrationError", response.json())
    with engine.connect() as c:
        assert (
            c.scalar(
                sa.select(sa.func.count())
                .select_from(Account)
                .where(Account.email_canonical == body["email"])
            )
            == 0
        )
    record = json.loads((directory / "registration.jsonl").read_text())
    assert record["incident_id"] == response.json()["incident_id"]
    assert record["request_id"] == response.headers["X-Request-ID"]
    assert record["delivery_status"] == "pending_channel"
    for secret in ("PRIVATE_SQL_PRIVATE_PASSWORD", body["password"], body["email"]):
        assert secret not in response.text + caplog.text + json.dumps(record)
    # A failed transaction did not consume the logical attempt or contact.
    assert post(client, body).status_code == 201


def test_reg10_extra_permissions_are_rejected(registered):
    client, _, data, _, _, _ = registered
    for changes in (
        {"roles": ["admin"]},
        {"requested_role": "admin"},
        {"driver_approved": True},
    ):
        response = post(client, data(**changes))
        assert response.status_code == 422
        assert response.json()["code"] == "VALIDATION_ERROR"


def test_reg11_draft_consent_does_not_enable_registration(registered):
    client, service, data, policy, _, _ = registered
    draft = service.settings.registration_consent_version + "-draft"
    policy(draft, state="draft")
    service.settings.registration_consent_version = draft
    result = client.get("/api/v2/registration-policy")
    validate_contract("RegistrationPolicy", result.json())
    assert result.json()["registration_enabled"] is False
    assert result.json()["consent"] is None
    assert post(client, data()).json()["code"] == "REGISTRATION_DISABLED"


def test_twelve_supplied_synthetic_scenarios_execute_against_postgresql(registered):
    client, service, data, _, _, _ = registered
    document = json.loads(
        (
            Path(__file__).resolve().parents[3]
            / "Documentación/Contratos/examples/registration-v2-test-data.json"
        ).read_text(encoding="utf-8")
    )
    assert (
        document["environment"] == "test-only"
        and document["allow_external_notifications"] is False
    )
    # Scope fixture emails, keys and consent to this isolated test invocation;
    # preserve scenario relationships, phones, invalid fields and fixed date.
    domain = data()["email"].split("@")[1]
    keys, results = {}, {}
    for case in document["cases"]:
        body = deepcopy(case["request"])
        local = body["email"].split("@")[0]
        body["email"] = (
            local + "@" + (domain.upper() if body["email"].isupper() else domain)
        )
        body["consent"]["version"] = service.settings.registration_consent_version
        key = keys.setdefault(case["idempotency_key"], uuid4())
        # Scenarios represent separate actors; rate limiting has its own test.
        # Reset only this isolated fixture's limiter, never a runtime bypass.
        service.limiter = type(service.limiter)()
        response = post(client, body, key)
        expected = case["expected_server_result"]
        assert response.status_code == expected.get("http_status", 201), (
            case["id"],
            response.text,
        )
        result = response.json()
        validate_contract(
            "AccountCreatedV2" if response.status_code == 201 else "RegistrationError",
            result,
        )
        for field in ("code", "roles", "driver_approved", "driver_review_status"):
            if field in expected:
                assert result[field] == expected[field]
        if "same_account_as" in expected:
            assert result["id"] == results[expected["same_account_as"]]["id"]
        results[case["id"]] = result
