"""Allow the consent trigger to lock approval without runtime catalog writes."""

from alembic import op

revision = "0002_consent_guard"
down_revision = "0001_api_base"
branch_labels = None
depends_on = None


def upgrade():
    # The existing trigger only reads the fully-qualified consent table and
    # locks its row. No dynamic SQL or policy writes. The owner can lock while
    # runtime credentials keep the catalog read-only. A fixed search path
    # prevents object shadowing in this narrowly scoped definer function.
    op.execute("ALTER FUNCTION kora.require_approved_consent() SECURITY DEFINER")
    op.execute(
        "ALTER FUNCTION kora.require_approved_consent() "
        "SET search_path = pg_catalog, pg_temp"
    )
    op.execute("REVOKE ALL ON FUNCTION kora.require_approved_consent() FROM PUBLIC")


def downgrade():
    # Only exercised on the guarded disposable test database.
    op.execute("ALTER FUNCTION kora.require_approved_consent() SECURITY INVOKER")
    op.execute("ALTER FUNCTION kora.require_approved_consent() RESET search_path")
    op.execute("GRANT EXECUTE ON FUNCTION kora.require_approved_consent() TO PUBLIC")
