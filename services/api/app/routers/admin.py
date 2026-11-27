"""Rutas del portal admin-web. Siguen el contrato de
admin-web/docs/api-contract-requests.md y los archivos *.api.ts del portal."""
from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel

from .. import serializers
from ..common import add_audit, clean
from ..config import API_PREFIX, JUSTIFICATION_MIN_LENGTH, REASON_MIN_LENGTH, settings
from ..db import many, one, tx
from ..errors import fail, parse_uuid
from ..realtime import publish_all
from ..security import (
    AdminIdentity,
    access_token_seconds,
    create_access_token,
    create_file_token,
    create_session,
    current_admin,
    find_session,
    load_admin,
    now_utc,
    require_permission,
    revoke_session,
    verify_password,
)

router = APIRouter()

REFRESH_COOKIE = "refresh_token"
COOKIE_PATH = f"{API_PREFIX}/auth"


def _require_justification(value: str | None) -> str:
    justification = clean(value)
    if len(justification) < JUSTIFICATION_MIN_LENGTH:
        fail(422, "justification_required", "La justificación de acceso es obligatoria.")
    return justification


# ------------------------------------------------------- Autenticación (RF01)


class LoginBody(BaseModel):
    email: str = ""
    password: str = ""


def _login_response(admin: AdminIdentity) -> dict[str, Any]:
    return {
        "accessToken": create_access_token("admin", admin.id),
        "expiresInSeconds": access_token_seconds(),
        "user": admin.to_json(),
    }


def _check_origin(request: Request) -> None:
    """Protección CSRF: estas rutas dependen de una cookie, así que solo se
    aceptan desde los orígenes del portal (además de SameSite=Strict)."""
    origin = request.headers.get("origin")
    if origin and origin not in settings.cors_origins:
        fail(403, "forbidden_origin", "Origen no autorizado.")


@router.post("/auth/login")
def login(body: LoginBody, response: Response) -> dict[str, Any]:
    with tx() as cur:
        row = one(
            cur,
            "SELECT id, password_hash FROM admin_users WHERE lower(email) = %s AND is_active",
            (clean(body.email).lower(),),
        )
        if not row or not verify_password(body.password, row["password_hash"]):
            fail(401, "invalid_credentials", "Correo o contraseña incorrectos.")
        admin = load_admin(cur, row["id"])
        token, expires_at = create_session(cur, "admin", admin.id)
        add_audit(cur, admin.actor, "auth.login", "Sesión", admin.id)
    response.set_cookie(
        REFRESH_COOKIE,
        token,
        max_age=int((expires_at - now_utc()).total_seconds()),
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        path=COOKIE_PATH,
    )
    return _login_response(admin)


@router.post("/auth/refresh")
def refresh(request: Request) -> dict[str, Any]:
    _check_origin(request)
    with tx() as cur:
        session = find_session(cur, "admin", request.cookies.get(REFRESH_COOKIE))
        admin = load_admin(cur, session["admin_user_id"]) if session else None
    if not admin:
        fail(401, "session_expired", "No hay una sesión activa.")
    return _login_response(admin)


@router.post("/auth/logout", status_code=204)
def logout(request: Request, response: Response) -> None:
    _check_origin(request)
    with tx() as cur:
        revoke_session(cur, request.cookies.get(REFRESH_COOKIE))
    response.delete_cookie(REFRESH_COOKIE, path=COOKIE_PATH)


# ----------------------------------------- Conductoras (RF02, RF04, RF05, RNF02)


@router.get("/drivers")
def list_drivers(_: AdminIdentity = Depends(require_permission("drivers:view"))) -> list[dict]:
    with tx() as cur:
        rows = many(cur, "SELECT * FROM v_drivers_portal ORDER BY registered_at DESC")
        return [serializers.driver_summary(row) for row in rows]


@router.get("/drivers/{driver_id}")
def get_driver(
    driver_id: str, _: AdminIdentity = Depends(require_permission("drivers:view"))
) -> dict:
    with tx() as cur:
        detail = serializers.driver_detail(cur, parse_uuid(driver_id, "Conductora no encontrada."))
    return detail or fail(404, "not_found", "Conductora no encontrada.")


class ReviewBody(BaseModel):
    decision: str = ""
    reason: str | None = None


@router.post("/drivers/{driver_id}/review")
def review_driver(
    driver_id: str,
    body: ReviewBody,
    admin: AdminIdentity = Depends(require_permission("drivers:review")),
) -> dict:
    key = parse_uuid(driver_id, "Conductora no encontrada.")
    with tx() as cur:
        driver = one(
            cur,
            "SELECT id, status::text AS status, identity_verification::text AS identity "
            "FROM drivers WHERE id = %s FOR UPDATE",
            (key,),
        )
        if not driver:
            fail(404, "not_found", "Conductora no encontrada.")
        if driver["status"] != "pending_review":
            fail(409, "already_reviewed", "Esta solicitud ya fue revisada.")

        if body.decision == "approve":
            if driver["identity"] != "confirmed":
                fail(
                    409,
                    "verification_not_confirmed",
                    "No se puede aprobar: la verificación de identidad no está confirmada.",
                )
            status, reason = "approved", None
            add_audit(cur, admin.actor, "driver.approved", "Conductora", key)
        elif body.decision == "reject":
            reason = clean(body.reason)
            if len(reason) < REASON_MIN_LENGTH:
                fail(422, "reason_required", "El motivo del rechazo es obligatorio.")
            status = "rejected"
            add_audit(cur, admin.actor, "driver.rejected", "Conductora", key, None, f"Motivo: {reason}")
        else:
            fail(422, "invalid_decision", "Decisión no válida.")

        cur.execute(
            "UPDATE drivers SET status = %s, rejection_reason = %s, reviewed_by = %s, "
            "reviewed_at = now() WHERE id = %s",
            (status, reason, admin.id, key),
        )
        return serializers.driver_detail(cur, key)


class SensitiveAssetBody(BaseModel):
    kind: str = ""
    justification: str | None = None


@router.post("/drivers/{driver_id}/sensitive-assets")
def request_sensitive_asset(
    driver_id: str,
    body: SensitiveAssetBody,
    request: Request,
    admin: AdminIdentity = Depends(require_permission("drivers:sensitive")),
) -> dict:
    key = parse_uuid(driver_id, "Conductora no encontrada.")
    if body.kind not in ("photo", "template"):
        fail(422, "invalid_kind", "Tipo de dato no válido.")
    justification = _require_justification(body.justification)
    with tx() as cur:
        if not one(cur, "SELECT 1 FROM drivers WHERE id = %s", (key,)):
            fail(404, "not_found", "Conductora no encontrada.")
        reference = one(cur, "SELECT * FROM biometric_references WHERE driver_id = %s", (key,))
        path = reference[f"{body.kind}_path"] if reference else None
        if not path:
            fail(404, "asset_not_found", "La conductora no tiene ese dato registrado.")
        # La consulta queda auditada ANTES de entregar el contenido (RNF02).
        audit_id = add_audit(
            cur,
            admin.actor,
            "sensitive.photo_viewed" if body.kind == "photo" else "sensitive.template_viewed",
            "Conductora",
            key,
            justification,
        )
    minutes = 5
    base = str(request.base_url).rstrip("/")
    return {
        "kind": body.kind,
        "driverId": str(key),
        "contentUrl": f"{base}{API_PREFIX}/files/{create_file_token(path, minutes)}",
        "description": (
            "Fotografía de referencia de la conductora."
            if body.kind == "photo"
            else "Plantilla biométrica de la conductora."
        ),
        "auditEntryId": audit_id,
        "expiresAt": now_utc() + timedelta(minutes=minutes),
    }


# --------------------------------------------- Viajes (RF03, RF06, RF07, RF11)

ACTIVE_STATUSES = ("accepted", "driver_arriving", "in_progress")


@router.get("/trips")
def list_trips(
    scope: str = Query("active"),
    _: AdminIdentity = Depends(require_permission("trips:monitor")),
) -> list[dict]:
    # RNF01 / SUPUESTO: en el piloto, toda persona con trips:monitor ve todos los
    # viajes. Si el SRS define zonas o turnos, el filtro por usuario va aquí.
    with tx() as cur:
        if scope == "recent":
            rows = many(
                cur,
                serializers.TRIP_SELECT
                + "WHERE t.status IN ('completed', 'cancelled') "
                "ORDER BY COALESCE(t.ended_at, t.requested_at) DESC LIMIT 50",
            )
        else:
            rows = many(
                cur,
                serializers.TRIP_SELECT + "WHERE t.status = ANY(%s::trip_status[]) "
                "ORDER BY t.requested_at DESC",
                (list(ACTIVE_STATUSES),),
            )
        limits = serializers.thresholds(cur)
        return [serializers.trip_summary(cur, row, limits) for row in rows]


@router.get("/trips/{trip_id}")
def get_trip(trip_id: str, _: AdminIdentity = Depends(require_permission("trips:monitor"))) -> dict:
    with tx() as cur:
        detail = serializers.trip_detail(cur, parse_uuid(trip_id, "Viaje no encontrado."))
    return detail or fail(404, "not_found", "Viaje no encontrado.")


class JustificationBody(BaseModel):
    justification: str | None = None


@router.post("/trips/{trip_id}/position-history")
def position_history(
    trip_id: str,
    body: JustificationBody,
    admin: AdminIdentity = Depends(require_permission("trips:history")),
) -> list[dict]:
    key = parse_uuid(trip_id, "Viaje no encontrado.")
    justification = _require_justification(body.justification)
    with tx() as cur:
        if not one(cur, "SELECT 1 FROM trips WHERE id = %s", (key,)):
            fail(404, "not_found", "Viaje no encontrado.")
        add_audit(cur, admin.actor, "trip.history_viewed", "Viaje", key, justification)
        rows = many(
            cur, "SELECT * FROM positions WHERE trip_id = %s ORDER BY device_timestamp", (key,)
        )
        return [serializers.position(row) for row in rows]


# --------------------------------------- Alertas e incidencias (RF08, RF09, RF12)

OUTCOMES = ("false_alarm", "contact_established", "help_channel_used", "other")


@router.get("/alerts")
def list_alerts(_: AdminIdentity = Depends(require_permission("alerts:view"))) -> list[dict]:
    """Abiertas, en atención y resueltas en los últimos 7 días."""
    with tx() as cur:
        rows = many(
            cur,
            serializers.ALERT_SELECT
            + "WHERE a.status <> 'resolved' OR a.resolved_at > now() - interval '7 days' "
            "ORDER BY a.created_at DESC LIMIT 200",
        )
        return [serializers.alert(cur, row) for row in rows]


@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: str, admin: AdminIdentity = Depends(require_permission("alerts:attend"))
) -> dict:
    key = parse_uuid(alert_id, "Alerta no encontrada.")
    events: list[tuple[str, Any]] = []
    with tx() as cur:
        row = one(cur, "SELECT status::text AS status FROM alerts WHERE id = %s FOR UPDATE", (key,))
        if not row:
            fail(404, "not_found", "Alerta no encontrada.")
        if row["status"] == "open":
            cur.execute(
                "UPDATE alerts SET status = 'acknowledged', acknowledged_by = %s, "
                "acknowledged_at = now() WHERE id = %s",
                (admin.id, key),
            )
            add_audit(cur, admin.actor, "alert.acknowledged", "Alerta", key)
            events.append(("alert.updated", {"id": str(key)}))
        result = serializers.alert_by_id(cur, key)
    publish_all(events)
    return result


class ResolveBody(BaseModel):
    outcome: str = ""
    notes: str = ""


@router.post("/alerts/{alert_id}/resolve")
def resolve_alert(
    alert_id: str,
    body: ResolveBody,
    admin: AdminIdentity = Depends(require_permission("alerts:attend")),
) -> dict:
    key = parse_uuid(alert_id, "Alerta no encontrada.")
    notes = clean(body.notes)
    if body.outcome not in OUTCOMES:
        fail(422, "invalid_outcome", "Selecciona un resultado válido.")
    if len(notes) < REASON_MIN_LENGTH:
        fail(422, "notes_required", "Las notas de resolución son obligatorias.")
    with tx() as cur:
        row = one(cur, "SELECT status::text AS status FROM alerts WHERE id = %s FOR UPDATE", (key,))
        if not row:
            fail(404, "not_found", "Alerta no encontrada.")
        if row["status"] == "resolved":
            fail(409, "already_resolved", "La incidencia ya está resuelta.")
        cur.execute(
            "UPDATE alerts SET status = 'resolved', "
            "acknowledged_by = COALESCE(acknowledged_by, %s), "
            "acknowledged_at = COALESCE(acknowledged_at, now()), "
            "resolution_outcome = %s, resolution_notes = %s, resolved_by = %s, resolved_at = now() "
            "WHERE id = %s",
            (admin.id, body.outcome, notes, admin.id, key),
        )
        add_audit(cur, admin.actor, "alert.resolved", "Alerta", key, None, f"Resultado: {body.outcome}")
        result = serializers.alert_by_id(cur, key)
    publish_all([("alert.updated", {"id": str(key)})])
    return result


# -------------------------------------------------- Parámetros versionados (RF07)


@router.get("/parameters")
def list_parameters(_: AdminIdentity = Depends(current_admin)) -> list[dict]:
    """Cualquier sesión de administración: el monitoreo necesita los umbrales."""
    with tx() as cur:
        rows = many(cur, serializers.PARAMETER_SELECT + "ORDER BY p.param_key")
        return [serializers.parameter(row) for row in rows]


@router.get("/parameters/{key}/versions")
def list_parameter_versions(
    key: str, _: AdminIdentity = Depends(require_permission("parameters:view"))
) -> list[dict]:
    with tx() as cur:
        rows = many(
            cur,
            "SELECT v.*, u.full_name AS changed_by_name FROM parameter_versions v "
            "LEFT JOIN admin_users u ON u.id = v.changed_by "
            "WHERE v.param_key = %s ORDER BY v.version DESC",
            (key,),
        )
        return [serializers.parameter_version(row) for row in rows]


class ParameterBody(BaseModel):
    value: Any = None
    reason: str = ""


@router.put("/parameters/{key}")
def update_parameter(
    key: str,
    body: ParameterBody,
    admin: AdminIdentity = Depends(require_permission("parameters:edit")),
) -> dict:
    reason = clean(body.reason)
    with tx() as cur:
        row = one(cur, "SELECT * FROM parameters WHERE param_key = %s FOR UPDATE", (key,))
        if not row:
            fail(404, "not_found", "Parámetro no encontrado.")
        value = body.value
        if (
            isinstance(value, bool)
            or not isinstance(value, int)
            or value < row["min_value"]
            or value > row["max_value"]
        ):
            low, high = serializers.num(row["min_value"]), serializers.num(row["max_value"])
            fail(422, "invalid_value", f"El valor debe estar entre {low} y {high}.")
        if len(reason) < REASON_MIN_LENGTH:
            fail(422, "reason_required", "El motivo del cambio es obligatorio.")
        if value == row["current_value"]:
            fail(422, "same_value", "El valor nuevo es igual al vigente.")

        version = row["version"] + 1
        cur.execute(
            "INSERT INTO parameter_versions (param_key, version, previous_value, new_value, "
            "changed_by, reason) VALUES (%s, %s, %s, %s, %s, %s)",
            (key, version, row["current_value"], value, admin.id, reason),
        )
        cur.execute(
            "UPDATE parameters SET current_value = %s, version = %s, updated_at = now(), "
            "updated_by = %s WHERE param_key = %s",
            (value, version, admin.id, key),
        )
        previous = serializers.num(row["current_value"])
        add_audit(
            cur,
            admin.actor,
            "parameter.updated",
            "Parámetro",
            key,
            None,
            f"{previous} {row['unit']} → {value} {row['unit']}. Motivo: {reason}",
        )
        updated = one(cur, serializers.PARAMETER_SELECT + "WHERE p.param_key = %s", (key,))
        return serializers.parameter(updated)


# ------------------------------------------- Auditoría y privacidad (RF12, RF13)

PRIVACY_TRANSITIONS = {
    "received": ("in_review",),
    "in_review": ("completed", "rejected"),
    "completed": (),
    "rejected": (),
}


@router.get("/audit-log")
def list_audit(
    limit: int = Query(500, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    _: AdminIdentity = Depends(require_permission("audit:view")),
) -> list[dict]:
    """Solo lectura, más reciente primero. Admite paginación con limit/offset."""
    with tx() as cur:
        rows = many(
            cur,
            "SELECT * FROM audit_log ORDER BY occurred_at DESC LIMIT %s OFFSET %s",
            (limit, offset),
        )
        return [serializers.audit_entry(row) for row in rows]


@router.get("/privacy-requests")
def list_privacy_requests(
    _: AdminIdentity = Depends(require_permission("privacy:manage")),
) -> list[dict]:
    with tx() as cur:
        rows = many(cur, "SELECT * FROM privacy_requests ORDER BY created_at DESC")
        return [serializers.privacy_request(cur, row) for row in rows]


class PrivacyStatusBody(BaseModel):
    status: str = ""
    note: str = ""


@router.post("/privacy-requests/{request_id}/status")
def update_privacy_request(
    request_id: str,
    body: PrivacyStatusBody,
    admin: AdminIdentity = Depends(require_permission("privacy:manage")),
) -> dict:
    key = parse_uuid(request_id, "Solicitud no encontrada.")
    note = clean(body.note)
    with tx() as cur:
        row = one(cur, "SELECT * FROM privacy_requests WHERE id = %s FOR UPDATE", (key,))
        if not row:
            fail(404, "not_found", "Solicitud no encontrada.")
        if body.status not in PRIVACY_TRANSITIONS[row["status"]]:
            fail(409, "invalid_transition", "La solicitud no puede pasar a ese estado.")
        if len(note) < REASON_MIN_LENGTH:
            fail(422, "note_required", "La nota es obligatoria.")

        cur.execute("UPDATE privacy_requests SET status = %s WHERE id = %s", (body.status, key))
        cur.execute(
            "INSERT INTO privacy_request_events (request_id, actor, status, note) "
            "VALUES (%s, %s, %s, %s)",
            (key, admin.full_name, body.status, note),
        )
        # Retiro de consentimiento completado: se marca el consentimiento vigente (RF13).
        if (
            body.status == "completed"
            and row["type"] == "consent_withdrawal"
            and row["subject_account_id"]
        ):
            cur.execute(
                "UPDATE consent_records SET withdrawn_at = now() "
                "WHERE account_id = %s AND withdrawn_at IS NULL",
                (row["subject_account_id"],),
            )
        add_audit(
            cur,
            admin.actor,
            "privacy.status_changed",
            "Solicitud de datos",
            key,
            None,
            f"Nuevo estado: {body.status}",
        )
        updated = one(cur, "SELECT * FROM privacy_requests WHERE id = %s", (key,))
        return serializers.privacy_request(cur, updated)
