import hashlib
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from threading import Barrier
from uuid import uuid4

import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from kora_api.config import Settings
from kora_api.main import create_app
from kora_api.models import (
    Account,
    AccountConsent,
    AccountCredential,
    AccountRole,
    ConsentVersion,
    RegistrationReceipt,
)

pytestmark = pytest.mark.postgres


def add_account(connection, **changes):
    identifier = uuid4()
    values = {
        "id": identifier,
        "email_canonical": f"{identifier}@example.invalid",
        "phone_e164": f"+573{identifier.int % 1_000_000_000:09d}",
        "display_name": "Juliana Prueba",
        "birth_date": date(2000, 1, 1),
        **changes,
    }
    connection.execute(sa.insert(Account).values(**values))
    return values["id"]


def add_policy(connection, *, approved=True):
    version = "test-" + str(uuid4())
    body = "Texto sintético de prueba. No es autorización de personas reales."
    connection.execute(
        sa.insert(ConsentVersion).values(
            version=version,
            body=body,
            content_sha256=hashlib.sha256(body.encode()).digest(),
            state="approved" if approved else "draft",
            approved_at=datetime(2020, 1, 1, tzinfo=timezone.utc) if approved else None,
        )
    )
    return version


def test_migrations_start_empty_and_service_ready(postgres_engine, db):
    # The fixture performed upgrade, drift check, downgrade and upgrade on a guarded test DB.
    assert db.scalar(sa.text("SELECT postgis_version()"))
    for model in [
        Account,
        AccountCredential,
        AccountRole,
        ConsentVersion,
        AccountConsent,
        RegistrationReceipt,
    ]:
        assert db.scalar(sa.select(sa.func.count()).select_from(model)) == 0
    settings = Settings(
        _env_file=None,
        app_env="test",
        database_url=os.environ["KORA_TEST_DATABASE_URL"],
    )
    with TestClient(create_app(settings)) as client:
        assert client.get("/health/ready").json() == {"status": "ready"}
        assert client.get("/health/ready").status_code == 200
        assert (
            client.get("/api/v2/registration-policy").json()["registration_enabled"]
            is False
        )
        assert (
            client.post(
                "/api/v2/accounts", json={"password": "NEVER_PERSIST"}
            ).status_code
            == 503
        )
    assert db.scalar(sa.select(sa.func.count()).select_from(Account)) == 0


def test_display_name_is_not_unique_and_intention_does_not_grant_role(db):
    one = add_account(db)
    two = add_account(db, onboarding_intent="driver")
    assert one != two
    assert db.scalar(sa.select(sa.func.count()).select_from(AccountRole)) == 0


@pytest.mark.parametrize("duplicate", ["email_canonical", "phone_e164"])
def test_contacts_are_unique_in_database(db, duplicate):
    identifier = add_account(db)
    value = db.scalar(
        sa.select(getattr(Account, duplicate)).where(Account.id == identifier)
    )
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            add_account(db, **{duplicate: value})


@pytest.mark.parametrize(
    "changes",
    [
        {"email_canonical": "UPPER@example.invalid"},
        {"phone_e164": "3000000000"},
        {"display_name": " "},
        {"onboarding_intent": "admin"},
    ],
)
def test_basic_account_constraints(db, changes):
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            add_account(db, **changes)


def test_plain_password_or_unknown_role_cannot_be_stored(db):
    identifier = add_account(db)
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(
                sa.insert(AccountCredential).values(
                    account_id=identifier, password_hash="plain-password"
                )
            )
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(
                sa.insert(AccountRole).values(account_id=identifier, role="superuser")
            )


def test_consent_receipt_needs_approval_and_positive_acceptance(db):
    identifier = add_account(db)
    draft = add_policy(db, approved=False)
    approved = add_policy(db)
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(
                sa.insert(AccountConsent).values(
                    account_id=identifier, consent_version=draft
                )
            )
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(
                sa.insert(AccountConsent).values(
                    account_id=identifier, consent_version=approved, accepted=False
                )
            )
    db.execute(
        sa.insert(AccountConsent).values(
            account_id=identifier, consent_version=approved
        )
    )
    assert db.scalar(sa.select(sa.func.count()).select_from(AccountConsent)) == 1
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(
                sa.update(AccountConsent)
                .where(AccountConsent.account_id == identifier)
                .values(accepted_at=datetime.now(timezone.utc))
            )


def test_approved_text_and_hash_cannot_be_rewritten(db):
    version = add_policy(db)
    replacement = "Otro texto sintético."
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(
                sa.update(ConsentVersion)
                .where(ConsentVersion.version == version)
                .values(
                    body=replacement,
                    content_sha256=hashlib.sha256(replacement.encode()).digest(),
                )
            )
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(
                sa.update(ConsentVersion)
                .where(ConsentVersion.version == version)
                .values(state="draft", approved_at=None)
            )


def test_hash_must_correspond_to_consent_text(db):
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(
                sa.insert(ConsentVersion).values(
                    version="test-wrong",
                    body="Synthetic text",
                    content_sha256=b"x" * 32,
                )
            )


def test_idempotency_storage_requires_unique_key_and_no_credentials(db):
    identifier = add_account(db)
    key = uuid4()
    receipt = {
        "key": key,
        "request_fingerprint": b"x" * 32,
        "account_id": identifier,
        "response_body": {"id": str(identifier)},
        "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
    }
    db.execute(sa.insert(RegistrationReceipt).values(**receipt))
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(
                sa.update(RegistrationReceipt)
                .where(RegistrationReceipt.key == key)
                .values(response_body={"id": "changed"})
            )
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(sa.insert(RegistrationReceipt).values(**receipt))
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(
                sa.insert(RegistrationReceipt).values(
                    **{
                        **receipt,
                        "key": uuid4(),
                        "response_body": {"password": "not-allowed"},
                    }
                )
            )


def test_foreign_keys_prevent_orphan_roles(db):
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.execute(
                sa.insert(AccountRole).values(account_id=uuid4(), role="passenger")
            )


def test_database_serializes_duplicate_contacts(postgres_engine):
    identifiers = [uuid4(), uuid4()]
    email = f"race-{uuid4()}@example.invalid"
    barrier = Barrier(2)

    def insert(index):
        try:
            with postgres_engine.begin() as connection:
                barrier.wait(timeout=5)
                add_account(connection, id=identifiers[index], email_canonical=email)
            return "created"
        except IntegrityError:
            return "duplicate"

    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            result = list(pool.map(insert, [0, 1]))
        assert sorted(result) == ["created", "duplicate"]
    finally:
        # Only explicitly generated test IDs in the guarded local disposable database.
        with postgres_engine.begin() as connection:
            connection.execute(sa.delete(Account).where(Account.id.in_(identifiers)))
