"""Utilidades compartidas: auditoría, parámetros y conversión de valores."""
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

from .db import many

SYSTEM_ACTOR = {"id": "system", "name": "Sistema"}


def num(value: Any) -> Any:
    """numeric de PostgreSQL -> número JSON (entero cuando no tiene decimales)."""
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    return value


def actor_ref(actor_id: Any, name: str | None) -> dict[str, str]:
    if actor_id is None:
        return dict(SYSTEM_ACTOR)
    return {"id": str(actor_id), "name": name or ""}


def clean(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def add_audit(
    cur,
    actor: dict[str, str] | None,
    action: str,
    resource_type: str,
    resource_id: Any,
    justification: str | None = None,
    detail: str | None = None,
) -> str:
    """Registra una acción en la bitácora (RF12). `actor` None = Sistema."""
    cur.execute(
        "INSERT INTO audit_log (actor_id, actor_name, action, resource_type, resource_id, "
        "justification, detail) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
        (
            actor["id"] if actor else None,
            actor["name"] if actor else SYSTEM_ACTOR["name"],
            action,
            resource_type,
            str(resource_id),
            justification,
            detail,
        ),
    )
    return str(cur.fetchone()["id"])


def thresholds(cur) -> dict[str, float]:
    """Umbrales vigentes (RF07). Siempre se leen de la tabla parameters."""
    return {
        row["param_key"]: float(row["current_value"])
        for row in many(cur, "SELECT param_key, current_value FROM parameters")
    }


def add_business_days(start: datetime, days: int) -> datetime:
    """SUPUESTO: días hábiles = lunes a viernes (no descuenta festivos)."""
    current = start
    remaining = days
    while remaining > 0:
        current += timedelta(days=1)
        if current.weekday() < 5:
            remaining -= 1
    return current
