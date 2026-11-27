"""Comandos de administración. Se ejecutan desde services/api:

  python -m app.cli init-db        Aplica los scripts SQL pendientes de SQL_DIR.
  python -m app.cli create-admin   Crea una persona administradora del portal.
  python -m app.cli seed-pilot     Crea 4 usuarios de prueba (uno por rol).
"""
import argparse
import os
import secrets
import sys

import psycopg
from psycopg.rows import dict_row

from .config import PASSWORD_MIN_LENGTH, settings
from .security import hash_password

ROLES = ("super_admin", "operator", "verifier", "auditor")

# Usuarios sintéticos de prueba, uno por rol. La contraseña no está en el código:
# se pasa con --password o con la variable de entorno PILOT_PASSWORD.
PILOT_USERS = (
    ("Andrea Salcedo", "admin@piloto.test", "super_admin"),
    ("Natalia Cárdenas", "operadora@piloto.test", "operator"),
    ("Viviana Torres", "verificadora@piloto.test", "verifier"),
    ("Mónica Rueda", "auditora@piloto.test", "auditor"),
)


def _connect() -> psycopg.Connection:
    if not settings.database_url:
        sys.exit("Falta DATABASE_URL en services/api/.env")
    return psycopg.connect(settings.database_url, autocommit=True, row_factory=dict_row)


def init_db() -> None:
    files = sorted(settings.sql_dir.glob("*.sql"))
    if not files:
        sys.exit(f"No hay scripts .sql en {settings.sql_dir}")
    with _connect() as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations ("
            "filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
        )
        applied = {row["filename"] for row in conn.execute("SELECT filename FROM schema_migrations")}
        # Si el 001 se ejecutó a mano con psql, se registra en vez de repetirlo.
        first = files[0].name
        has_schema = conn.execute("SELECT to_regclass('public.accounts') AS t").fetchone()["t"]
        if first not in applied and has_schema:
            conn.execute("INSERT INTO schema_migrations (filename) VALUES (%s)", (first,))
            applied.add(first)
            print(f"  ya estaba aplicado: {first}")
        for path in files:
            if path.name in applied:
                continue
            # Cada script trae su propio BEGIN/COMMIT.
            conn.execute(path.read_text(encoding="utf-8"))
            conn.execute("INSERT INTO schema_migrations (filename) VALUES (%s)", (path.name,))
            print(f"  aplicado: {path.name}")
    print("Base de datos lista.")


def _upsert_admin(conn, full_name: str, email: str, role: str, password: str) -> None:
    conn.execute(
        "INSERT INTO admin_users (full_name, email, password_hash, role) "
        "VALUES (%s, %s, %s, %s) ON CONFLICT (email) DO UPDATE SET "
        "full_name = EXCLUDED.full_name, password_hash = EXCLUDED.password_hash, "
        "role = EXCLUDED.role, is_active = true",
        (full_name, email.strip().lower(), hash_password(password), role),
    )


def create_admin(full_name: str, email: str, role: str, password: str | None) -> None:
    generated = password is None
    password = password or secrets.token_urlsafe(12)
    if len(password) < PASSWORD_MIN_LENGTH:
        sys.exit(f"La contraseña debe tener al menos {PASSWORD_MIN_LENGTH} caracteres.")
    with _connect() as conn:
        _upsert_admin(conn, full_name, email, role, password)
    print(f"Usuario listo: {email} ({role})")
    if generated:
        print(f"Contraseña generada (guárdala, no se vuelve a mostrar): {password}")


def seed_pilot(password: str | None = None) -> None:
    password = password or os.environ.get("PILOT_PASSWORD", "")
    if len(password) < PASSWORD_MIN_LENGTH:
        sys.exit(
            "Indica la contraseña de los usuarios de prueba con --password o PILOT_PASSWORD "
            f"(mínimo {PASSWORD_MIN_LENGTH} caracteres)."
        )
    with _connect() as conn:
        for full_name, email, role in PILOT_USERS:
            _upsert_admin(conn, full_name, email, role, password)
            print(f"  {email} ({role})")
    print("Usuarios de prueba listos. Son cuentas sintéticas: no usar con datos reales.")


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("init-db", help="Aplica los scripts SQL pendientes")
    pilot = commands.add_parser("seed-pilot", help="Crea 4 usuarios de prueba (uno por rol)")
    pilot.add_argument("--password", help="Si se omite, se lee PILOT_PASSWORD")
    admin = commands.add_parser("create-admin", help="Crea una persona administradora")
    admin.add_argument("--name", required=True)
    admin.add_argument("--email", required=True)
    admin.add_argument("--role", required=True, choices=ROLES)
    admin.add_argument("--password", help="Si se omite, se genera una aleatoria")
    args = parser.parse_args()

    if args.command == "init-db":
        init_db()
    elif args.command == "seed-pilot":
        seed_pilot(args.password)
    else:
        create_admin(args.name, args.email, args.role, args.password)


if __name__ == "__main__":
    main()
