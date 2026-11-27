import os

import pytest
from alembic import command
from pydantic import SecretStr
from sqlalchemy.engine import make_url

from kora_api.database import make_engine, postgres_url
from kora_api.migrate import migration_config


@pytest.fixture(scope="session")
def postgres_engine():
    raw = os.environ.get("KORA_TEST_DATABASE_URL")
    if not raw:
        pytest.skip(
            "No disposable PostgreSQL configured; CI runs these tests with PostGIS"
        )
    url = make_url(raw)
    if (
        url.host not in {"127.0.0.1", "localhost"}
        or not url.database
        or not url.database.startswith("kora_test_")
        or os.environ.get("APP_ENV") != "test"
    ):
        pytest.fail(
            "Integration tests require APP_ENV=test and a local disposable kora_test_* database"
        )
    # The following migration reset is confined to the guarded disposable test database.
    previous = os.environ.get("MIGRATION_DATABASE_URL")
    os.environ["MIGRATION_DATABASE_URL"] = raw
    engine = make_engine(postgres_url(SecretStr(raw)), pool_pre_ping=True)
    try:
        config = migration_config()
        command.upgrade(config, "head")
        command.check(config)
        command.downgrade(config, "base")
        command.upgrade(config, "head")
        command.check(config)
        yield engine
    finally:
        engine.dispose()
        if previous is None:
            os.environ.pop("MIGRATION_DATABASE_URL", None)
        else:
            os.environ["MIGRATION_DATABASE_URL"] = previous


@pytest.fixture
def db(postgres_engine):
    with postgres_engine.connect() as connection:
        transaction = connection.begin()
        try:
            yield connection
        finally:
            transaction.rollback()
