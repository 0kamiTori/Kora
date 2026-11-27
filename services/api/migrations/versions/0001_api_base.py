"""Initial shared identity storage. Does not seed accounts or policies."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001_api_base"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE SCHEMA IF NOT EXISTS kora")
    op.create_table(
        "accounts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email_canonical", sa.String(254), nullable=False),
        sa.Column("phone_e164", sa.String(16), nullable=False),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("birth_date", sa.Date(), nullable=False),
        sa.Column(
            "onboarding_intent",
            sa.String(9),
            nullable=False,
            server_default="passenger",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
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
        schema="kora",
    )
    op.create_table(
        "account_credentials",
        sa.Column(
            "account_id",
            sa.Uuid(),
            sa.ForeignKey("kora.accounts.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "password_hash LIKE '$argon2id$%'", name="ck_credentials_hash_shape"
        ),
        schema="kora",
    )
    op.create_table(
        "account_roles",
        sa.Column(
            "account_id",
            sa.Uuid(),
            sa.ForeignKey("kora.accounts.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column("role", sa.String(9), primary_key=True),
        sa.CheckConstraint(
            "role IN ('passenger','driver','admin')", name="ck_account_roles_value"
        ),
        schema="kora",
    )
    op.create_table(
        "consent_versions",
        sa.Column("version", sa.String(100), primary_key=True),
        sa.Column(
            "scope", sa.String(32), nullable=False, server_default="account_creation"
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("content_sha256", sa.LargeBinary(), nullable=False),
        sa.Column("state", sa.String(8), nullable=False, server_default="draft"),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
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
            "(state='draft' AND approved_at IS NULL) OR (state IN ('approved','retired') AND approved_at IS NOT NULL)",
            name="ck_consent_approval_time",
        ),
        schema="kora",
    )
    op.create_table(
        "account_consents",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "account_id",
            sa.Uuid(),
            sa.ForeignKey("kora.accounts.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "consent_version",
            sa.String(100),
            sa.ForeignKey("kora.consent_versions.version", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("accepted", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "accepted_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("account_id", "consent_version", name="uq_account_consent"),
        sa.CheckConstraint("accepted IS TRUE", name="ck_account_consent_accepted"),
        schema="kora",
    )
    op.create_table(
        "registration_receipts",
        sa.Column("key", sa.Uuid(), primary_key=True),
        sa.Column("request_fingerprint", sa.LargeBinary(), nullable=False),
        sa.Column(
            "account_id",
            sa.Uuid(),
            sa.ForeignKey("kora.accounts.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("response_body", postgresql.JSONB(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "octet_length(request_fingerprint)=32", name="ck_receipt_fingerprint"
        ),
        sa.CheckConstraint("expires_at > created_at", name="ck_receipt_expiry"),
        sa.CheckConstraint(
            "jsonb_typeof(response_body)='object' AND NOT (response_body ?| ARRAY['password','email','phone','birth_date','access_token','refresh_token'])",
            name="ck_receipt_response_shape",
        ),
        schema="kora",
    )
    op.execute("""
        CREATE FUNCTION kora.protect_approved_consent() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
          IF OLD.state IN ('approved','retired') AND (
            NEW.version IS DISTINCT FROM OLD.version OR
            NEW.scope IS DISTINCT FROM OLD.scope OR
            NEW.body IS DISTINCT FROM OLD.body OR
            NEW.content_sha256 IS DISTINCT FROM OLD.content_sha256 OR
            NEW.approved_at IS DISTINCT FROM OLD.approved_at OR
            NEW.state = 'draft' OR (OLD.state='retired' AND NEW.state <> 'retired')
          ) THEN
            RAISE EXCEPTION 'Approved consent is immutable' USING ERRCODE='23514';
          END IF;
          RETURN NEW;
        END $$;
    """)
    op.execute(
        "CREATE TRIGGER protect_approved_consent BEFORE UPDATE ON kora.consent_versions "
        "FOR EACH ROW EXECUTE FUNCTION kora.protect_approved_consent()"
    )
    op.execute("""
        CREATE FUNCTION kora.require_approved_consent() RETURNS trigger
        LANGUAGE plpgsql AS $$
        DECLARE consent_state text;
        BEGIN
          SELECT state INTO consent_state FROM kora.consent_versions
            WHERE version=NEW.consent_version FOR SHARE;
          IF consent_state IS DISTINCT FROM 'approved' THEN
            RAISE EXCEPTION 'Consent version is not approved' USING ERRCODE='23514';
          END IF;
          RETURN NEW;
        END $$;
    """)
    op.execute(
        "CREATE TRIGGER require_approved_consent BEFORE INSERT ON kora.account_consents "
        "FOR EACH ROW EXECUTE FUNCTION kora.require_approved_consent()"
    )
    op.execute("""
        CREATE FUNCTION kora.reject_receipt_update() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'Receipt is immutable' USING ERRCODE='23514';
        END $$;
    """)
    for table in ["account_consents", "registration_receipts"]:
        op.execute(
            f"CREATE TRIGGER reject_receipt_update BEFORE UPDATE ON kora.{table} "
            "FOR EACH ROW EXECUTE FUNCTION kora.reject_receipt_update()"
        )


def downgrade():
    # Only used by the disposable database round-trip tests. No CASCADE or extension drop.
    op.drop_table("account_consents", schema="kora")
    op.execute("DROP FUNCTION kora.require_approved_consent()")
    op.drop_table("registration_receipts", schema="kora")
    op.execute("DROP FUNCTION kora.reject_receipt_update()")
    op.drop_table("consent_versions", schema="kora")
    op.execute("DROP FUNCTION kora.protect_approved_consent()")
    op.drop_table("account_roles", schema="kora")
    op.drop_table("account_credentials", schema="kora")
    op.drop_table("accounts", schema="kora")
    op.execute("DROP SCHEMA kora")
