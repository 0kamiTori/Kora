"""Acceso a PostgreSQL con psycopg 3 (síncrono) y un pool de conexiones.

Se usa el modo síncrono a propósito: en Windows el modo asíncrono de psycopg no
funciona con el bucle de eventos por defecto. FastAPI ejecuta los endpoints
`def` en un pool de hilos, así que no se bloquea el servidor.
"""
from contextlib import contextmanager
from typing import Any, Iterator

from psycopg import Cursor
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import settings

_pool: ConnectionPool | None = None


def open_pool() -> None:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            settings.database_url,
            min_size=1,
            max_size=10,
            # prepare_threshold=None: sin sentencias preparadas, para que funcione
            # detrás de un pooler en modo transacción (PgBouncer, Neon "-pooler").
            kwargs={"row_factory": dict_row, "prepare_threshold": None},
            # Descarta conexiones que el servidor cerró por inactividad (bases en la nube).
            check=ConnectionPool.check_connection,
            max_idle=120,
            open=True,
        )


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


@contextmanager
def tx() -> Iterator[Cursor[dict[str, Any]]]:
    """Una transacción: confirma al salir y revierte si hay una excepción."""
    if _pool is None:
        raise RuntimeError("El pool de base de datos no está abierto.")
    with _pool.connection() as conn:
        with conn.cursor() as cur:
            yield cur


def one(cur: Cursor, sql: str, params: Any = None) -> dict[str, Any] | None:
    cur.execute(sql, params)
    return cur.fetchone()


def many(cur: Cursor, sql: str, params: Any = None) -> list[dict[str, Any]]:
    cur.execute(sql, params)
    return cur.fetchall()
