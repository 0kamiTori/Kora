"""Rutas provisionales para clientes móviles, bajo /api/v1/mobile.

AVISO: NO implementan el contrato de registro v2 del repositorio
(Documentación/Contratos/registration-v2.openapi.json, POST /api/v2/accounts) ni
el diseño v1 de Documentación/Contratos/openapi.json. Existen para poder generar
datos sintéticos y probar el portal de punta a punta. La app Flutter no debe
integrarse contra ellas: se sustituirán al implementar los contratos acordados.

Escriben en las MISMAS tablas que lee el portal admin-web: la inscripción de
una conductora hecha aquí es la que aparece en el módulo de revisión del portal.

A diferencia del portal, la app móvil recibe el token de renovación en el
cuerpo (lo guarda en el almacenamiento seguro del dispositivo), no en una cookie.
"""
import secrets
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import psycopg
from fastapi import APIRouter, Depends, File, Form, UploadFile
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from .. import biometrics, monitoring, serializers
from ..common import add_business_days, clean
from ..config import PASSWORD_MIN_LENGTH, REASON_MIN_LENGTH, settings
from ..db import many, one, tx
from ..errors import fail, parse_uuid
from ..geo import polyline_length_m
from ..realtime import publish_all
from ..security import (
    AccountIdentity,
    access_token_seconds,
    create_access_token,
    create_session,
    current_account,
    find_session,
    hash_password,
    load_account,
    now_utc,
    require_role,
    revoke_session,
    verify_password,
)

router = APIRouter(prefix="/mobile")

CONSENT_SCOPES = {"location", "biometric", "notifications", "trusted_contact_sharing"}
DOCUMENT_TYPES = {"CC", "CE", "PA", "PPT"}
# Documentos que el portal revisa en cada solicitud de conductora.
REQUIRED_DOCUMENTS = ("Licencia de conducción", "SOAT", "Revisión técnico-mecánica")
ACTIVE_STATUSES = ("requested", "accepted", "driver_arriving", "in_progress")
MAX_UPLOAD_BYTES = 8 * 1024 * 1024
IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png"}
DOCUMENT_FILE_TYPES = {**IMAGE_TYPES, "application/pdf": ".pdf"}

UNIQUE_ERRORS = {
    "accounts_email_key": ("email_taken", "Ya existe una cuenta con ese correo."),
    "drivers_document_unique": ("document_taken", "Ya existe una conductora con ese documento."),
    "vehicles_plate_key": ("plate_taken", "Ya existe un vehículo registrado con esa placa."),
}


# ------------------------------------------------------------------ Modelos


class LatLng(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class Place(LatLng):
    label: str = Field(min_length=1, max_length=200)


class PassengerRegistration(BaseModel):
    email: str
    password: str
    policyVersion: str = Field(min_length=1, max_length=40)
    consentScopes: list[str]


class VehicleBody(BaseModel):
    plate: str = Field(min_length=5, max_length=10)
    model: str = Field(min_length=2, max_length=80)
    color: str = Field(min_length=2, max_length=40)


class DriverRegistration(PassengerRegistration):
    """Formulario de inscripción de conductora: mismos campos que revisa el portal."""

    fullName: str = Field(min_length=5, max_length=120)
    documentType: str = "CC"
    documentNumber: str = Field(min_length=5, max_length=20)
    phone: str = Field(min_length=7, max_length=20)
    vehicle: VehicleBody


class LoginBody(BaseModel):
    email: str = ""
    password: str = ""


class RefreshBody(BaseModel):
    refreshToken: str = ""


class TripRequest(BaseModel):
    origin: Place
    destination: Place
    # Ruta de referencia calculada por el proveedor de mapas de la app.
    # Si no se envía, se usa la línea recta entre origen y destino.
    routePoints: list[LatLng] | None = Field(default=None, max_length=2000)


class StatusBody(BaseModel):
    status: str


class PositionBody(LatLng):
    id: uuid.UUID  # lo genera el dispositivo: permite reenviar sin duplicar (RNF04)
    deviceTimestamp: datetime
    accuracyMeters: float = Field(ge=0, le=10_000)
    speedKmh: float | None = Field(default=None, ge=0, le=400)


class PositionsBody(BaseModel):
    positions: list[PositionBody] = Field(min_length=1, max_length=200)


class RouteChangeBody(BaseModel):
    destination: Place
    routePoints: list[LatLng] | None = Field(default=None, max_length=2000)
    reason: str


class ShareLinkBody(BaseModel):
    durationMinutes: int = Field(default=60, ge=5, le=240)


class MobileAlertBody(BaseModel):
    type: str


class PrivacyRequestBody(BaseModel):
    type: str


# ---------------------------------------------------------------- Utilidades


def _email(value: str) -> str:
    email = clean(value).lower()
    local, _, domain = email.partition("@")
    if not local or "." not in domain or " " in email or len(email) > 254:
        fail(422, "invalid_email", "El correo no es válido.")
    return email


def _password(value: str) -> str:
    if len(value) < PASSWORD_MIN_LENGTH:
        fail(
            422,
            "weak_password",
            f"La contraseña debe tener al menos {PASSWORD_MIN_LENGTH} caracteres.",
        )
    return value


def _scopes(values: list[str], required: set[str]) -> list[str]:
    scopes = sorted(set(values))
    if not set(scopes) <= CONSENT_SCOPES:
        fail(422, "invalid_consent", "El consentimiento incluye un alcance no válido.")
    missing = required - set(scopes)
    if missing:
        fail(
            422,
            "consent_required",
            "Debes aceptar el tratamiento de datos necesario para usar el servicio: "
            + ", ".join(sorted(missing))
            + ".",
        )
    return scopes


def _alias(prefix: str) -> str:
    """Alias operativo: el portal monitorea sin necesitar el nombre real."""
    return f"{prefix} {secrets.randbelow(10_000):04d}"


def _session_response(cur, account: AccountIdentity) -> dict[str, Any]:
    refresh_token, _ = create_session(cur, "account", account.id)
    return {
        "accessToken": create_access_token("account", account.id),
        "expiresInSeconds": access_token_seconds(),
        "refreshToken": refresh_token,
        "account": account.to_json(),
    }


def _unique_error(error: psycopg.errors.UniqueViolation):
    code, message = UNIQUE_ERRORS.get(
        error.diag.constraint_name or "", ("conflict", "Ya existe un registro con esos datos.")
    )
    fail(409, code, message)


def _create_account(cur, role: str, body: PassengerRegistration, scopes: list[str], alias: str):
    cur.execute(
        "INSERT INTO accounts (role, display_name, email, password_hash) "
        "VALUES (%s, %s, %s, %s) RETURNING id",
        (role, alias, _email(body.email), hash_password(_password(body.password))),
    )
    account_id = cur.fetchone()["id"]
    cur.execute(
        "INSERT INTO consent_records (account_id, policy_version, scopes) "
        "VALUES (%s, %s, %s::consent_scope[])",
        (account_id, body.policyVersion, scopes),
    )
    return account_id


def _save_upload(upload: UploadFile, folder: str, allowed: dict[str, str]) -> str:
    """Guarda el archivo y devuelve su ruta relativa a STORAGE_DIR."""
    extension = allowed.get(upload.content_type or "")
    if not extension:
        fail(422, "invalid_file_type", "Tipo de archivo no permitido.")
    data = upload.file.read(MAX_UPLOAD_BYTES + 1)
    if not data:
        fail(422, "empty_file", "El archivo está vacío.")
    if len(data) > MAX_UPLOAD_BYTES:
        fail(413, "file_too_large", "El archivo supera el tamaño máximo de 8 MB.")
    relative = Path(folder) / f"{uuid.uuid4().hex}{extension}"
    target = settings.storage_dir / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return relative.as_posix()


def _own_driver(cur, account: AccountIdentity, lock: bool = False) -> dict[str, Any]:
    row = one(
        cur,
        "SELECT id, status::text AS status, identity_verification::text AS identity "
        "FROM drivers WHERE account_id = %s" + (" FOR UPDATE" if lock else ""),
        (account.id,),
    )
    return row or fail(404, "not_found", "No hay una inscripción de conductora para esta cuenta.")


def _points(route_points: list[LatLng] | None, origin: LatLng, destination: LatLng) -> list[dict]:
    points = route_points if route_points and len(route_points) >= 2 else [origin, destination]
    return [{"lat": point.lat, "lng": point.lng} for point in points]


def _trip_for(cur, trip_id: str, account: AccountIdentity, lock: bool = False) -> dict[str, Any]:
    """Carga el viaje solo si la cuenta participa en él (RNF01)."""
    key = parse_uuid(trip_id, "Viaje no encontrado.")
    row = one(
        cur,
        "SELECT t.*, d.account_id AS driver_account_id FROM trips t "
        "LEFT JOIN drivers d ON d.id = t.driver_id WHERE t.id = %s"
        + (" FOR UPDATE OF t" if lock else ""),
        (key,),
    )
    if not row:
        fail(404, "not_found", "Viaje no encontrado.")
    if account.id not in (row["passenger_account_id"], row["driver_account_id"]):
        fail(403, "forbidden", "No participas en este viaje.")
    return row


def _mobile_trip(cur, trip_id: Any) -> dict[str, Any]:
    """Viaje para la app: lo mismo que ve el portal, más el vehículo asignado."""
    detail = serializers.trip_detail(cur, trip_id)
    vehicle = one(
        cur,
        "SELECT v.plate, v.model, v.color FROM vehicles v JOIN trips t ON t.driver_id = v.driver_id "
        "WHERE t.id = %s",
        (trip_id,),
    )
    detail["vehicle"] = vehicle
    return detail


def _change_status(cur, trip: dict[str, Any], new_status: str, actor: str) -> None:
    extra = ""
    if new_status == "in_progress":
        extra = ", started_at = now()"
    elif new_status in ("completed", "cancelled"):
        extra = (
            ", ended_at = now(), active_deviation_meters = NULL, "
            "active_deviation_since = NULL, active_stop_since = NULL"
        )
    cur.execute(f"UPDATE trips SET status = %s{extra} WHERE id = %s", (new_status, trip["id"]))
    cur.execute(
        "INSERT INTO trip_status_changes (trip_id, from_status, to_status, actor) "
        "VALUES (%s, %s, %s, %s)",
        (trip["id"], trip["status"], new_status, actor),
    )
    if new_status in ("completed", "cancelled"):
        # El enlace del Contacto de Confianza deja de servir al terminar el viaje.
        cur.execute(
            "UPDATE share_links SET revoked_at = now() WHERE trip_id = %s AND revoked_at IS NULL",
            (trip["id"],),
        )


# ------------------------------------------------------- Cuentas y sesión (RF01)


@router.post("/auth/register/passenger", status_code=201)
def register_passenger(body: PassengerRegistration) -> dict[str, Any]:
    scopes = _scopes(body.consentScopes, {"location"})
    try:
        with tx() as cur:
            account_id = _create_account(cur, "passenger", body, scopes, _alias("Pasajera"))
            return _session_response(cur, load_account(cur, account_id))
    except psycopg.errors.UniqueViolation as error:
        _unique_error(error)


@router.post("/auth/register/driver", status_code=201)
def register_driver(body: DriverRegistration) -> dict[str, Any]:
    """Inscripción de conductora. Queda en `pending_review` para el portal."""
    scopes = _scopes(body.consentScopes, {"location", "biometric"})
    if body.documentType not in DOCUMENT_TYPES:
        fail(422, "invalid_document_type", "Tipo de documento no válido.")
    document_number = clean(body.documentNumber).replace(".", "").replace(" ", "")
    phone = clean(body.phone).replace(" ", "")
    if not document_number.isalnum():
        fail(422, "invalid_document_number", "El número de documento no es válido.")
    if not phone.lstrip("+").isdigit():
        fail(422, "invalid_phone", "El teléfono no es válido.")
    try:
        with tx() as cur:
            account_id = _create_account(cur, "driver", body, scopes, _alias("Conductora"))
            cur.execute(
                "INSERT INTO drivers (account_id, full_name, document_type, document_number, phone) "
                "VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (account_id, clean(body.fullName), body.documentType, document_number, phone),
            )
            driver_id = cur.fetchone()["id"]
            cur.execute(
                "INSERT INTO vehicles (driver_id, plate, model, color) VALUES (%s, %s, %s, %s)",
                (
                    driver_id,
                    " ".join(clean(body.vehicle.plate).upper().split()),
                    clean(body.vehicle.model),
                    clean(body.vehicle.color),
                ),
            )
            for label in REQUIRED_DOCUMENTS:
                cur.execute(
                    "INSERT INTO driver_documents (driver_id, label) VALUES (%s, %s)",
                    (driver_id, label),
                )
            cur.execute(
                "INSERT INTO verifications (driver_id, kind, threshold, model_version) "
                "VALUES (%s, 'enrollment', 0, %s)",
                (driver_id, biometrics.model_version()),
            )
            return _session_response(cur, load_account(cur, account_id))
    except psycopg.errors.UniqueViolation as error:
        _unique_error(error)


@router.post("/auth/login")
def login(body: LoginBody) -> dict[str, Any]:
    with tx() as cur:
        row = one(
            cur,
            "SELECT id, password_hash FROM accounts WHERE email = %s "
            "AND role IN ('passenger', 'driver')",
            (clean(body.email).lower(),),
        )
        if not row or not verify_password(body.password, row["password_hash"]):
            fail(401, "invalid_credentials", "Correo o contraseña incorrectos.")
        return _session_response(cur, load_account(cur, row["id"]))


@router.post("/auth/refresh")
def refresh(body: RefreshBody) -> dict[str, Any]:
    with tx() as cur:
        session = find_session(cur, "account", body.refreshToken)
        account = load_account(cur, session["account_id"]) if session else None
        if not account:
            fail(401, "session_expired", "No hay una sesión activa.")
        return {
            "accessToken": create_access_token("account", account.id),
            "expiresInSeconds": access_token_seconds(),
            "account": account.to_json(),
        }


@router.post("/auth/logout", status_code=204)
def logout(body: RefreshBody) -> None:
    with tx() as cur:
        revoke_session(cur, body.refreshToken)


@router.get("/me")
def me(account: AccountIdentity = Depends(current_account)) -> dict[str, Any]:
    return account.to_json()


# ------------------------------------------ Conductora: inscripción (RF02, RF04)


@router.get("/driver/me")
def driver_me(account: AccountIdentity = Depends(require_role("driver"))) -> dict[str, Any]:
    """Estado de la solicitud tal como lo ve el portal (incluye motivo de rechazo)."""
    with tx() as cur:
        return serializers.driver_detail(cur, _own_driver(cur, account)["id"])


@router.put("/driver/documents")
def upload_document(
    label: str = Form(...),
    expiresAt: datetime | None = Form(None),
    file: UploadFile = File(...),
    account: AccountIdentity = Depends(require_role("driver")),
) -> dict[str, Any]:
    """multipart/form-data: label (uno de los documentos requeridos), expiresAt, file.
    El documento queda en `pending` hasta que la administración lo valide."""
    if label not in REQUIRED_DOCUMENTS:
        fail(
            422,
            "invalid_document",
            "Documento no reconocido. Usa: " + ", ".join(REQUIRED_DOCUMENTS) + ".",
        )
    if expiresAt is not None and expiresAt.tzinfo is None:
        fail(422, "invalid_date", "La fecha de vencimiento debe incluir zona horaria.")
    with tx() as cur:
        driver = _own_driver(cur, account, lock=True)
        path = _save_upload(file, f"drivers/{driver['id']}/documents", DOCUMENT_FILE_TYPES)
        cur.execute(
            "INSERT INTO driver_documents (driver_id, label, status, expires_at, file_path) "
            "VALUES (%s, %s, 'pending', %s, %s) "
            "ON CONFLICT (driver_id, label) DO UPDATE SET status = 'pending', "
            "expires_at = EXCLUDED.expires_at, file_path = EXCLUDED.file_path",
            (driver["id"], label, expiresAt, path),
        )
        return serializers.driver_detail(cur, driver["id"])


@router.put("/driver/biometric-reference")
def upload_biometric_reference(
    photo: UploadFile = File(...),
    account: AccountIdentity = Depends(require_role("driver")),
) -> dict[str, Any]:
    """multipart/form-data: photo (JPEG o PNG). Registra la fotografía de
    referencia y ejecuta la verificación de inscripción (ver app/biometrics.py)."""
    with tx() as cur:
        driver = _own_driver(cur, account, lock=True)
        consent = one(
            cur,
            "SELECT 1 FROM consent_records WHERE account_id = %s AND withdrawn_at IS NULL "
            "AND 'biometric' = ANY(scopes) LIMIT 1",
            (account.id,),
        )
        if not consent:
            fail(403, "consent_required", "Falta el consentimiento para datos biométricos.")
        path = _save_upload(photo, f"drivers/{driver['id']}/biometric", IMAGE_TYPES)
        cur.execute(
            "INSERT INTO biometric_references (driver_id, model_version, photo_path) "
            "VALUES (%s, %s, %s) ON CONFLICT (driver_id) DO UPDATE SET "
            "photo_path = EXCLUDED.photo_path, model_version = EXCLUDED.model_version, "
            "created_at = now()",
            (driver["id"], biometrics.model_version(), path),
        )
        result = biometrics.evaluate_enrollment(settings.storage_dir / path)
        if result is not None:
            cur.execute(
                "UPDATE verifications SET status = %s, result = %s, score = %s, "
                "liveness_status = %s, model_version = %s, completed_at = now() "
                "WHERE id = (SELECT id FROM verifications WHERE driver_id = %s "
                "AND kind = 'enrollment' ORDER BY requested_at DESC LIMIT 1)",
                (
                    result["status"],
                    result["result"],
                    result["score"],
                    result["liveness_status"],
                    biometrics.model_version(),
                    driver["id"],
                ),
            )
            cur.execute(
                "UPDATE drivers SET identity_verification = %s WHERE id = %s",
                (result["status"], driver["id"]),
            )
        return serializers.driver_detail(cur, driver["id"])


# ------------------------------------------------------ Viajes (RF03, RF06, RF07)


@router.post("/trips", status_code=201)
def request_trip(
    body: TripRequest, account: AccountIdentity = Depends(require_role("passenger"))
) -> dict[str, Any]:
    points = _points(body.routePoints, body.origin, body.destination)
    with tx() as cur:
        # El bloqueo de la cuenta evita dos solicitudes simultáneas de la misma pasajera.
        cur.execute("SELECT 1 FROM accounts WHERE id = %s FOR UPDATE", (account.id,))
        active = one(
            cur,
            "SELECT 1 FROM trips WHERE passenger_account_id = %s "
            "AND status = ANY(%s::trip_status[]) LIMIT 1",
            (account.id, list(ACTIVE_STATUSES)),
        )
        if active:
            fail(409, "trip_in_course", "Ya tienes un viaje en curso.")
        cur.execute(
            "INSERT INTO trips (passenger_account_id, passenger_alias, origin_label, origin_lat, "
            "origin_lng, destination_label, destination_lat, destination_lng) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (
                account.id,
                account.display_name,
                body.origin.label,
                body.origin.lat,
                body.origin.lng,
                body.destination.label,
                body.destination.lat,
                body.destination.lng,
            ),
        )
        trip_id = cur.fetchone()["id"]
        cur.execute(
            "INSERT INTO reference_routes (trip_id, version, points, distance_meters) "
            "VALUES (%s, 1, %s, %s)",
            (trip_id, Jsonb(points), round(polyline_length_m(points))),
        )
        cur.execute(
            "INSERT INTO trip_status_changes (trip_id, from_status, to_status, actor) "
            "VALUES (%s, NULL, 'requested', %s)",
            (trip_id, account.display_name),
        )
        result = _mobile_trip(cur, trip_id)
    publish_all([("trip.updated", {"id": str(trip_id)})])
    return result


@router.get("/trips/current")
def current_trip(account: AccountIdentity = Depends(current_account)) -> dict[str, Any] | None:
    """Viaje activo de la cuenta (pasajera o conductora), o null."""
    with tx() as cur:
        row = one(
            cur,
            "SELECT t.id FROM trips t LEFT JOIN drivers d ON d.id = t.driver_id "
            "WHERE (t.passenger_account_id = %s OR d.account_id = %s) "
            "AND t.status = ANY(%s::trip_status[]) ORDER BY t.requested_at DESC LIMIT 1",
            (account.id, account.id, list(ACTIVE_STATUSES)),
        )
        return _mobile_trip(cur, row["id"]) if row else None


@router.get("/trips/available")
def available_trips(account: AccountIdentity = Depends(require_role("driver"))) -> list[dict]:
    """Solicitudes abiertas. Solo para conductoras aprobadas con identidad confirmada."""
    with tx() as cur:
        driver = _own_driver(cur, account)
        if driver["status"] != "approved" or driver["identity"] != "confirmed":
            fail(403, "driver_not_enabled", "Tu cuenta de conductora aún no está habilitada.")
        rows = many(
            cur,
            "SELECT t.*, r.distance_meters FROM trips t "
            "LEFT JOIN reference_routes r ON r.trip_id = t.id AND r.version = 1 "
            "WHERE t.status = 'requested' ORDER BY t.requested_at LIMIT 20",
        )
    return [
        {
            "id": str(row["id"]),
            "passengerAlias": row["passenger_alias"],
            "origin": {
                "lat": row["origin_lat"],
                "lng": row["origin_lng"],
                "label": row["origin_label"],
            },
            "destination": {
                "lat": row["destination_lat"],
                "lng": row["destination_lng"],
                "label": row["destination_label"],
            },
            "requestedAt": row["requested_at"],
            "distanceMeters": row["distance_meters"],
        }
        for row in rows
    ]


@router.get("/trips/{trip_id}")
def get_trip(trip_id: str, account: AccountIdentity = Depends(current_account)) -> dict[str, Any]:
    with tx() as cur:
        return _mobile_trip(cur, _trip_for(cur, trip_id, account)["id"])


@router.post("/trips/{trip_id}/accept")
def accept_trip(
    trip_id: str, account: AccountIdentity = Depends(require_role("driver"))
) -> dict[str, Any]:
    key = parse_uuid(trip_id, "Viaje no encontrado.")
    with tx() as cur:
        driver = _own_driver(cur, account, lock=True)
        if driver["status"] != "approved" or driver["identity"] != "confirmed":
            fail(403, "driver_not_enabled", "Tu cuenta de conductora aún no está habilitada.")
        busy = one(
            cur,
            "SELECT 1 FROM trips WHERE driver_id = %s AND status = ANY(%s::trip_status[]) LIMIT 1",
            (driver["id"], list(ACTIVE_STATUSES)),
        )
        if busy:
            fail(409, "trip_in_course", "Ya tienes un viaje en curso.")
        trip = one(cur, "SELECT * FROM trips WHERE id = %s FOR UPDATE", (key,))
        if not trip:
            fail(404, "not_found", "Viaje no encontrado.")
        if trip["status"] != "requested":
            fail(409, "trip_not_available", "El viaje ya no está disponible.")
        cur.execute("UPDATE trips SET driver_id = %s WHERE id = %s", (driver["id"], key))
        _change_status(cur, trip, "accepted", "Conductora")
        result = _mobile_trip(cur, key)
    publish_all([("trip.updated", {"id": str(key)})])
    return result


# Transiciones válidas (RF03) y quién puede ejecutarlas. Coinciden con
# TRIP_TRANSITIONS del portal (src/features/trips/trip.types.ts).
DRIVER_TRANSITIONS = {
    "accepted": ("driver_arriving", "cancelled"),
    "driver_arriving": ("in_progress", "cancelled"),
    "in_progress": ("completed", "cancelled"),
}
PASSENGER_TRANSITIONS = {
    "requested": ("cancelled",),
    "accepted": ("cancelled",),
    "driver_arriving": ("cancelled",),
    "in_progress": ("cancelled",),
}


@router.post("/trips/{trip_id}/status")
def change_trip_status(
    trip_id: str, body: StatusBody, account: AccountIdentity = Depends(current_account)
) -> dict[str, Any]:
    with tx() as cur:
        trip = _trip_for(cur, trip_id, account, lock=True)
        is_driver = account.id == trip["driver_account_id"]
        allowed = (DRIVER_TRANSITIONS if is_driver else PASSENGER_TRANSITIONS).get(trip["status"], ())
        if body.status not in allowed:
            fail(409, "invalid_transition", "El viaje no puede pasar a ese estado.")
        _change_status(cur, trip, body.status, "Conductora" if is_driver else account.display_name)
        result = _mobile_trip(cur, trip["id"])
    publish_all([("trip.updated", {"id": str(trip["id"])})])
    return result


@router.post("/trips/{trip_id}/positions")
def send_positions(
    trip_id: str, body: PositionsBody, account: AccountIdentity = Depends(require_role("driver"))
) -> dict[str, Any]:
    """Posiciones GPS de la conductora. Admite lotes: tras una pérdida de
    conexión la app reenvía lo pendiente y los `id` repetidos se descartan."""
    events: list[tuple[str, Any]] = []
    for item in body.positions:
        if item.deviceTimestamp.tzinfo is None:
            fail(422, "invalid_timestamp", "deviceTimestamp debe incluir zona horaria.")
    with tx() as cur:
        trip = _trip_for(cur, trip_id, account, lock=True)
        if account.id != trip["driver_account_id"]:
            fail(403, "forbidden", "Solo la conductora del viaje puede enviar posiciones.")
        if trip["status"] not in ("accepted", "driver_arriving", "in_progress"):
            fail(409, "trip_not_active", "El viaje no está activo.")
        accepted = 0
        for item in sorted(body.positions, key=lambda entry: entry.deviceTimestamp):
            cur.execute(
                "INSERT INTO positions (id, trip_id, lat, lng, device_timestamp, accuracy_meters, "
                "speed_kmh) VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                (
                    item.id,
                    trip["id"],
                    item.lat,
                    item.lng,
                    item.deviceTimestamp,
                    item.accuracyMeters,
                    item.speedKmh,
                ),
            )
            accepted += cur.rowcount
        if accepted:
            latest = one(
                cur,
                "SELECT * FROM positions WHERE trip_id = %s ORDER BY device_timestamp DESC LIMIT 1",
                (trip["id"],),
            )
            events.append(("position.updated", serializers.position(latest)))
            monitoring.process_latest_position(cur, events, trip["id"])
    publish_all(events)
    return {"accepted": accepted, "duplicates": len(body.positions) - accepted}


@router.post("/trips/{trip_id}/route-change")
def change_route(
    trip_id: str,
    body: RouteChangeBody,
    account: AccountIdentity = Depends(require_role("passenger")),
) -> dict[str, Any]:
    """RF06: la pasajera autoriza un cambio de destino; crea una versión de la ruta."""
    reason = clean(body.reason)
    if len(reason) < REASON_MIN_LENGTH:
        fail(422, "reason_required", "El motivo del cambio de ruta es obligatorio.")
    with tx() as cur:
        trip = _trip_for(cur, trip_id, account, lock=True)
        if trip["status"] not in ("accepted", "driver_arriving", "in_progress"):
            fail(409, "trip_not_active", "El viaje no está activo.")
        origin = LatLng(lat=trip["origin_lat"], lng=trip["origin_lng"])
        last = one(
            cur,
            "SELECT lat, lng FROM positions WHERE trip_id = %s ORDER BY device_timestamp DESC LIMIT 1",
            (trip["id"],),
        )
        start = LatLng(lat=last["lat"], lng=last["lng"]) if last else origin
        points = _points(body.routePoints, start, body.destination)
        version = one(
            cur,
            "SELECT COALESCE(max(version), 0) + 1 AS next FROM reference_routes WHERE trip_id = %s",
            (trip["id"],),
        )["next"]
        cur.execute(
            "INSERT INTO reference_routes (trip_id, version, points, distance_meters) "
            "VALUES (%s, %s, %s, %s) RETURNING id",
            (trip["id"], version, Jsonb(points), round(polyline_length_m(points))),
        )
        route_id = cur.fetchone()["id"]
        cur.execute(
            "INSERT INTO route_changes (route_id, authorized_by, reason) VALUES (%s, 'passenger', %s)",
            (route_id, reason),
        )
        cur.execute(
            "UPDATE trips SET destination_label = %s, destination_lat = %s, destination_lng = %s, "
            "active_deviation_meters = NULL, active_deviation_since = NULL WHERE id = %s",
            (body.destination.label, body.destination.lat, body.destination.lng, trip["id"]),
        )
        result = _mobile_trip(cur, trip["id"])
    publish_all([("trip.updated", {"id": str(trip["id"])})])
    return result


# ----------------------------------- Contacto de Confianza y alertas (RF09, RF10)


@router.post("/trips/{trip_id}/share-link", status_code=201)
def create_share_link(
    trip_id: str,
    body: ShareLinkBody,
    account: AccountIdentity = Depends(require_role("passenger")),
) -> dict[str, Any]:
    """Crea el enlace temporal. La app arma la URL del portal con el token:
    <portal>/track/<token> (ruta pública definida en admin-web/src/app/router.tsx)."""
    with tx() as cur:
        consent = one(
            cur,
            "SELECT 1 FROM consent_records WHERE account_id = %s AND withdrawn_at IS NULL "
            "AND 'trusted_contact_sharing' = ANY(scopes) LIMIT 1",
            (account.id,),
        )
        if not consent:
            fail(
                403,
                "consent_required",
                "Falta el consentimiento para compartir el viaje con un contacto de confianza.",
            )
        trip = _trip_for(cur, trip_id, account, lock=True)
        if trip["status"] not in ACTIVE_STATUSES:
            fail(409, "trip_not_active", "El viaje no está activo.")
        # Un solo enlace vigente por viaje: el anterior se revoca.
        cur.execute(
            "UPDATE share_links SET revoked_at = now() WHERE trip_id = %s AND revoked_at IS NULL",
            (trip["id"],),
        )
        token = secrets.token_urlsafe(32)
        expires_at = now_utc() + timedelta(minutes=body.durationMinutes)
        cur.execute(
            "INSERT INTO share_links (token, trip_id, expires_at) VALUES (%s, %s, %s)",
            (token, trip["id"], expires_at),
        )
    publish_all([("trip.updated", {"id": str(trip["id"])})])
    return {"token": token, "expiresAt": expires_at}


@router.delete("/trips/{trip_id}/share-link", status_code=204)
def revoke_share_link(
    trip_id: str, account: AccountIdentity = Depends(require_role("passenger"))
) -> None:
    with tx() as cur:
        trip = _trip_for(cur, trip_id, account)
        cur.execute(
            "UPDATE share_links SET revoked_at = now() WHERE trip_id = %s AND revoked_at IS NULL",
            (trip["id"],),
        )
    publish_all([("trip.updated", {"id": str(trip["id"])})])


MOBILE_ALERTS = {
    "help_button": "Se activó el botón de ayuda durante el viaje.",
    "silent_alert": "Se activó una alerta silenciosa durante el viaje.",
}


@router.post("/trips/{trip_id}/alerts", status_code=201)
def raise_alert(
    trip_id: str, body: MobileAlertBody, account: AccountIdentity = Depends(current_account)
) -> dict[str, Any]:
    """Botón de ayuda o alerta silenciosa. Llega al portal en tiempo real.
    NO implica despacho automático de emergencias."""
    if body.type not in MOBILE_ALERTS:
        fail(422, "invalid_alert_type", "Tipo de alerta no válido.")
    events: list[tuple[str, Any]] = []
    with tx() as cur:
        trip = _trip_for(cur, trip_id, account, lock=True)
        if trip["status"] not in ACTIVE_STATUSES:
            fail(409, "trip_not_active", "El viaje no está activo.")
        existing = one(
            cur,
            "SELECT id, created_at, status FROM alerts WHERE trip_id = %s AND type = %s "
            "AND status <> 'resolved' ORDER BY created_at DESC LIMIT 1",
            (trip["id"], body.type),
        )
        if existing:  # repetir el botón no duplica la alerta
            return {
                "id": str(existing["id"]),
                "createdAt": existing["created_at"],
                "status": existing["status"],
            }
        alert_id = monitoring.create_alert(
            cur, events, trip["id"], body.type, MOBILE_ALERTS[body.type]
        )
        created = one(cur, "SELECT created_at, status FROM alerts WHERE id = %s", (alert_id,))
    publish_all(events)
    return {"id": alert_id, "createdAt": created["created_at"], "status": created["status"]}


# ---------------------------------------- Datos personales, Ley 1581 (RF13)

# SUPUESTO: plazos en días hábiles (consulta 10, reclamo 15), sin festivos.
PRIVACY_DUE_DAYS = {"access": 10, "consent_withdrawal": 15, "deletion": 15}


@router.post("/privacy-requests", status_code=201)
def create_privacy_request(
    body: PrivacyRequestBody, account: AccountIdentity = Depends(current_account)
) -> dict[str, Any]:
    if body.type not in PRIVACY_DUE_DAYS:
        fail(422, "invalid_request_type", "Tipo de solicitud no válido.")
    with tx() as cur:
        cur.execute(
            "INSERT INTO privacy_requests (type, subject_account_id, subject_alias, subject_role, "
            "due_at) VALUES (%s, %s, %s, %s, %s) RETURNING *",
            (
                body.type,
                account.id,
                account.display_name,
                account.role,
                add_business_days(now_utc(), PRIVACY_DUE_DAYS[body.type]),
            ),
        )
        row = cur.fetchone()
        cur.execute(
            "INSERT INTO privacy_request_events (request_id, actor, status, note) "
            "VALUES (%s, %s, 'received', 'Solicitud creada desde la app.')",
            (row["id"], account.display_name),
        )
        return serializers.privacy_request(cur, row)


@router.get("/privacy-requests")
def list_privacy_requests(account: AccountIdentity = Depends(current_account)) -> list[dict]:
    with tx() as cur:
        rows = many(
            cur,
            "SELECT * FROM privacy_requests WHERE subject_account_id = %s ORDER BY created_at DESC",
            (account.id,),
        )
        return [serializers.privacy_request(cur, row) for row in rows]
