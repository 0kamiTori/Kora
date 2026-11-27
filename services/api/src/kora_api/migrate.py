"""Sanitized migration CLI. Never prints the URL or raw driver exception."""

import argparse
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config


def migration_config() -> Config:
    return Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Köra database migration commands")
    parser.add_argument("action", choices=["upgrade", "current", "check"])
    parser.add_argument(
        "--sql", action="store_true", help="Generate upgrade SQL without connecting"
    )
    args = parser.parse_args()
    if args.sql and args.action != "upgrade":
        parser.error("--sql is only supported with upgrade")
    try:
        config = migration_config()
        if args.action == "upgrade":
            command.upgrade(config, "head", sql=args.sql)
        elif args.action == "current":
            command.current(config)
        else:
            command.check(config)
        return 0
    except Exception:
        print(
            "Migration failed. Check connection, privileges and schema; credentials are not displayed.",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
