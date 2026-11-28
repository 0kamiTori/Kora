import pytest

from kora_api import integration


def test_isolated_configuration_never_reads_neon_env(tmp_path, monkeypatch):
    config = tmp_path / "isolated.env"
    monkeypatch.setattr(integration, "CONFIG", config)
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql://private:PRIVATE_VALUE@remote.invalid/neondb?sslmode=require",
    )
    monkeypatch.setenv(
        "MIGRATION_DATABASE_URL",
        "postgresql://private:PRIVATE_VALUE@remote.invalid/neondb?sslmode=require",
    )
    integration.initialize()
    first = config.read_bytes()
    settings = integration.load_settings()
    assert settings.app_env == "test"
    assert "PRIVATE_VALUE" not in first.decode()
    assert (
        settings.database_url.get_secret_value()
        != settings.migration_database_url.get_secret_value()
    )
    integration.initialize()
    assert config.read_bytes() == first


@pytest.mark.parametrize(
    "mutation",
    [
        'DATABASE_URL="postgresql://owner:synthetic@remote.invalid/neondb?sslmode=require"',
        'APP_ENV="pilot"',
        'REGISTRATION_CONSENT_VERSION="real-policy"',
        'MIGRATION_DATABASE_URL="postgresql://owner:synthetic@127.0.0.1:55433/neondb"',
    ],
)
def test_setup_refuses_nonisolated_targets_before_migrations(
    tmp_path, monkeypatch, mutation
):
    config = tmp_path / "isolated.env"
    monkeypatch.setattr(integration, "CONFIG", config)
    integration.initialize()
    key = mutation.split("=", 1)[0]
    lines = [
        line
        for line in config.read_text().splitlines()
        if not line.startswith(key + "=")
    ]
    config.write_text("\n".join(lines + [mutation]) + "\n")

    def forbidden(*args, **kwargs):
        pytest.fail("Migration must not run for a rejected configuration")

    monkeypatch.setattr(integration.command, "upgrade", forbidden)
    with pytest.raises(Exception):
        integration.prepare()


def test_missing_config_fails_without_falling_back_to_default_env(
    tmp_path, monkeypatch
):
    monkeypatch.setattr(integration, "CONFIG", tmp_path / "missing.env")
    with pytest.raises(ValueError):
        integration.load_settings()
