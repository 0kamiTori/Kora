from datetime import date, datetime
from uuid import UUID, uuid4

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    metadata = sa.MetaData(schema="kora")


class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = (
        sa.UniqueConstraint("email_canonical", name="uq_accounts_email"),
        sa.UniqueConstraint("phone_e164", name="uq_accounts_phone"),
        sa.CheckConstraint(
            "email_canonical = lower(btrim(email_canonical)) AND length(email_canonical) >= 3",
            name="ck_accounts_email_canonical",
        ),
        sa.CheckConstraint(
            "length(display_name) BETWEEN 1 AND 100 AND length(btrim(display_name)) > 0",
            name="ck_accounts_display_name",
        ),
        sa.CheckConstraint(
            "phone_e164 ~ '^\\+[1-9][0-9]{6,14}$'", name="ck_accounts_phone_shape"
        ),
        sa.CheckConstraint(
            "onboarding_intent IN ('passenger','driver')", name="ck_accounts_intent"
        ),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    email_canonical: Mapped[str] = mapped_column(sa.String(254))
    phone_e164: Mapped[str] = mapped_column(sa.String(16))
    display_name: Mapped[str] = mapped_column(sa.String(100))
    birth_date: Mapped[date] = mapped_column(sa.Date)
    onboarding_intent: Mapped[str] = mapped_column(
        sa.String(9), server_default="passenger"
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now()
    )


class AccountCredential(Base):
    __tablename__ = "account_credentials"
    __table_args__ = (
        sa.CheckConstraint(
            "password_hash LIKE '$argon2id$%'", name="ck_credentials_hash_shape"
        ),
    )
    account_id: Mapped[UUID] = mapped_column(
        sa.ForeignKey("kora.accounts.id", ondelete="RESTRICT"), primary_key=True
    )
    password_hash: Mapped[str] = mapped_column(sa.Text)
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now()
    )


class AccountRole(Base):
    __tablename__ = "account_roles"
    __table_args__ = (
        sa.CheckConstraint(
            "role IN ('passenger','driver','admin')", name="ck_account_roles_value"
        ),
    )
    account_id: Mapped[UUID] = mapped_column(
        sa.ForeignKey("kora.accounts.id", ondelete="RESTRICT"), primary_key=True
    )
    role: Mapped[str] = mapped_column(sa.String(9), primary_key=True)


class ConsentVersion(Base):
    __tablename__ = "consent_versions"
    __table_args__ = (
        sa.CheckConstraint(
            "state IN ('draft','approved','retired')", name="ck_consent_state"
        ),
        sa.CheckConstraint("scope = 'account_creation'", name="ck_consent_scope"),
        sa.CheckConstraint("length(body) > 0", name="ck_consent_body"),
        sa.CheckConstraint(
            "content_sha256 = sha256(convert_to(body, 'UTF8'))",
            name="ck_consent_digest",
        ),
        sa.CheckConstraint(
            "(state='draft' AND approved_at IS NULL) OR "
            "(state IN ('approved','retired') AND approved_at IS NOT NULL)",
            name="ck_consent_approval_time",
        ),
    )
    version: Mapped[str] = mapped_column(sa.String(100), primary_key=True)
    scope: Mapped[str] = mapped_column(sa.String(32), server_default="account_creation")
    body: Mapped[str] = mapped_column(sa.Text)
    content_sha256: Mapped[bytes] = mapped_column(sa.LargeBinary)
    state: Mapped[str] = mapped_column(sa.String(8), server_default="draft")
    approved_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now()
    )


class AccountConsent(Base):
    __tablename__ = "account_consents"
    __table_args__ = (
        sa.UniqueConstraint("account_id", "consent_version", name="uq_account_consent"),
        sa.CheckConstraint("accepted IS TRUE", name="ck_account_consent_accepted"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    account_id: Mapped[UUID] = mapped_column(
        sa.ForeignKey("kora.accounts.id", ondelete="RESTRICT")
    )
    consent_version: Mapped[str] = mapped_column(
        sa.ForeignKey("kora.consent_versions.version", ondelete="RESTRICT")
    )
    accepted: Mapped[bool] = mapped_column(sa.Boolean, server_default=sa.true())
    accepted_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now()
    )


class RegistrationReceipt(Base):
    __tablename__ = "registration_receipts"
    __table_args__ = (
        sa.CheckConstraint(
            "octet_length(request_fingerprint)=32", name="ck_receipt_fingerprint"
        ),
        sa.CheckConstraint("expires_at > created_at", name="ck_receipt_expiry"),
        sa.CheckConstraint(
            "jsonb_typeof(response_body)='object' AND NOT "
            "(response_body ?| ARRAY['password','email','phone','birth_date','access_token','refresh_token'])",
            name="ck_receipt_response_shape",
        ),
    )
    key: Mapped[UUID] = mapped_column(primary_key=True)
    request_fingerprint: Mapped[bytes] = mapped_column(sa.LargeBinary)
    account_id: Mapped[UUID] = mapped_column(
        sa.ForeignKey("kora.accounts.id", ondelete="RESTRICT")
    )
    response_body: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True))
