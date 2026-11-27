from logging.config import fileConfig

from alembic import context
from sqlalchemy.pool import NullPool

from kora_api.config import Settings
from kora_api.database import make_engine, postgres_url
from kora_api.models import Base

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)


def include_name(name, type_, parent_names):
    if type_ == "schema":
        return name == "kora"
    if type_ == "table":
        return parent_names.get("schema_name") == "kora"
    return True


options = {
    "target_metadata": Base.metadata,
    "version_table": "kora_alembic_version",
    "version_table_schema": "public",
    "include_schemas": True,
    "include_name": include_name,
    "compare_type": True,
    "compare_server_default": True,
}

if context.is_offline_mode():
    context.configure(dialect_name="postgresql", literal_binds=True, **options)
    with context.begin_transaction():
        context.run_migrations()
else:
    settings = Settings()
    engine = make_engine(
        postgres_url(
            settings.migration_database_url or settings.database_url,
            require_tls=settings.app_env == "pilot",
        ),
        poolclass=NullPool,
    )
    try:
        with engine.connect() as connection:
            context.configure(connection=connection, **options)
            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()
