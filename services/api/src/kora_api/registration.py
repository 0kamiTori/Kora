import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from threading import BoundedSemaphore, Lock
from time import monotonic
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

import sqlalchemy as sa
from argon2 import PasswordHasher
from argon2.profiles import RFC_9106_LOW_MEMORY
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from kora_api.config import Settings
from kora_api.database import Database, postgres_url
from kora_api.models import (
    Account,
    AccountConsent,
    AccountCredential,
    AccountRole,
    ConsentVersion,
    RegistrationReceipt,
)
from kora_api.registration_errors import RegistrationError
from kora_api.registration_validation import validate_registration

HASHER = PasswordHasher.from_parameters(RFC_9106_LOW_MEMORY)
HASH_SLOTS = BoundedSemaphore(2)


class AttemptLimiter:
    """Bounded per-process test protection. Not a distributed production limiter."""

    def __init__(self):
        self._lock = Lock()
        self._attempts: dict[str, tuple[float, int]] = {}

    def allow(self, peer: str) -> bool:
        now = monotonic()
        with self._lock:
            self._attempts = {
                key: value for key, value in self._attempts.items() if value[0] > now
            }
            expires, count = self._attempts.get(peer, (now + 60, 0))
            if count >= 10 or (
                peer not in self._attempts and len(self._attempts) >= 4096
            ):
                return False
            self._attempts[peer] = (expires, count + 1)
            return True


class RegistrationService:
    def __init__(self, settings: Settings, database: Database):
        self.settings, self.database = settings, database
        self.clock = lambda: datetime.now(timezone.utc)
        self.limiter = AttemptLimiter()

    @property
    def enabled_for_tests(self):
        try:
            url = postgres_url(self.settings.database_url)
            key = self.settings.registration_hmac_key
            return bool(
                self.settings.app_env == "test"
                and self.settings.registration_mode == "synthetic_test"
                and url.host in {"localhost", "127.0.0.1"}
                and url.database.startswith("kora_test_")
                and key
                and len(key.get_secret_value().encode("utf-8")) >= 32
                and (self.settings.registration_consent_version or "").startswith(
                    "test-"
                )
            )
        except Exception:
            return False

    def peer_key(self, peer: str):
        return hmac.digest(
            self.settings.registration_hmac_key.get_secret_value().encode(),
            b"peer:" + peer.encode(),
            "sha256",
        ).hex()

    def approved_consent(self, session: Session):
        now = self.clock()
        return session.scalar(
            sa.select(ConsentVersion)
            .where(
                ConsentVersion.version == self.settings.registration_consent_version,
                ConsentVersion.scope == "account_creation",
                ConsentVersion.state == "approved",
                ConsentVersion.approved_at <= now,
            )
            .with_for_update(read=True)
        )

    def policy(self):
        consent = None
        if self.enabled_for_tests:
            with Session(self.database.engine) as session, session.begin():
                approved = self.approved_consent(session)
                if approved:
                    consent = {"version": approved.version, "text": approved.body}
        return {
            "policy_version": "registration-v2-test-only",
            "registration_enabled": consent is not None,
            "server_date": self.clock()
            .astimezone(ZoneInfo("America/Bogota"))
            .date()
            .isoformat(),
            "minimum_age": 18,
            "display_name_max_length": 100,
            "password_rules": {
                "minimum_length": 12,
                "uppercase": True,
                "lowercase": True,
                "digit": True,
                "special_character": True,
            },
            "consent": consent,
        }

    def register(self, body: object, key: UUID):
        if not self.enabled_for_tests:
            raise RegistrationError("REGISTRATION_DISABLED")
        now = self.clock()
        data = validate_registration(
            body, now.astimezone(ZoneInfo("America/Bogota")).date()
        )
        fingerprint = hmac.digest(
            self.settings.registration_hmac_key.get_secret_value().encode(),
            json.dumps(
                data.canonical(),
                sort_keys=True,
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode("utf-8"),
            "sha256",
        )
        lock_id = int.from_bytes(
            hashlib.sha256(b"kora:registration:" + key.bytes).digest()[:8],
            "big",
            signed=True,
        )
        try:
            with Session(self.database.engine) as session, session.begin():
                session.execute(sa.text("SET LOCAL statement_timeout = '5s'"))
                if not session.scalar(
                    sa.text("SELECT pg_try_advisory_xact_lock(:key)"), {"key": lock_id}
                ):
                    raise RegistrationError("REGISTRATION_IN_PROGRESS")
                receipt = session.get(RegistrationReceipt, key)
                if receipt:
                    if receipt.expires_at <= now or not hmac.compare_digest(
                        receipt.request_fingerprint, fingerprint
                    ):
                        raise RegistrationError("IDEMPOTENCY_CONFLICT")
                    return receipt.response_body, True
                consent = self.approved_consent(session)
                if consent is None:
                    raise RegistrationError("REGISTRATION_DISABLED")
                if consent.version != data.consent_version:
                    raise RegistrationError(
                        "CONSENT_VERSION_CHANGED",
                        [("consent.version", "CONSENT_VERSION_CHANGED")],
                    )
                if not HASH_SLOTS.acquire(blocking=False):
                    raise RegistrationError("RATE_LIMITED")
                try:
                    password_hash = HASHER.hash(data.password)
                finally:
                    HASH_SLOTS.release()
                account = Account(
                    id=uuid4(),
                    email_canonical=data.email,
                    phone_e164=data.phone_e164,
                    display_name=data.display_name,
                    birth_date=data.birth_date,
                    onboarding_intent=data.requested_role,
                    created_at=now,
                )
                session.add(account)
                session.flush()
                session.add_all(
                    [
                        AccountCredential(
                            account_id=account.id,
                            password_hash=password_hash,
                            updated_at=now,
                        ),
                        AccountRole(account_id=account.id, role="passenger"),
                        AccountConsent(
                            account_id=account.id,
                            consent_version=consent.version,
                            accepted=True,
                            accepted_at=now,
                        ),
                    ]
                )
                response = {
                    "id": str(account.id),
                    "display_name": account.display_name,
                    "roles": ["passenger"],
                    "driver_approved": False,
                    "driver_review_status": "not_submitted",
                    "created_at": now.isoformat(),
                    "consent_receipt": {
                        "version": consent.version,
                        "recorded_at": now.isoformat(),
                    },
                }
                session.add(
                    RegistrationReceipt(
                        key=key,
                        request_fingerprint=fingerprint,
                        account_id=account.id,
                        response_body=response,
                        created_at=now,
                        expires_at=now + timedelta(hours=24),
                    )
                )
                session.flush()
            return response, False
        except IntegrityError as error:
            if getattr(getattr(error.orig, "diag", None), "constraint_name", None) in {
                "uq_accounts_email",
                "uq_accounts_phone",
            }:
                raise RegistrationError("CONTACT_NOT_AVAILABLE") from None
            raise
