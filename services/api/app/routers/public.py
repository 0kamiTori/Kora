"""Rutas sin sesión: vista pública del Contacto de Confianza (RF10) y descarga
de archivos sensibles mediante URL firmada de vida corta (RNF02)."""
import threading
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Request, Response
from fastapi.responses import FileResponse

from .. import serializers
from ..config import settings
from ..db import one, tx
from ..errors import fail
from ..security import read_file_token

router = APIRouter()

# Límite de peticiones por token e IP (en memoria de este proceso).
RATE_LIMIT = 60
RATE_WINDOW_SECONDS = 60
_hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)
_hits_lock = threading.Lock()


def _rate_limit(token: str, request: Request) -> None:
    key = (token, request.client.host if request.client else "")
    now = time.monotonic()
    with _hits_lock:
        hits = _hits[key]
        while hits and now - hits[0] > RATE_WINDOW_SECONDS:
            hits.popleft()
        if len(hits) >= RATE_LIMIT:
            fail(429, "too_many_requests", "Demasiadas consultas. Intenta de nuevo en un momento.")
        hits.append(now)
        if len(_hits) > 10_000:  # evita que el mapa crezca sin límite
            for stale in [k for k, v in _hits.items() if not v or now - v[-1] > RATE_WINDOW_SECONDS]:
                _hits.pop(stale, None)


@router.get("/public/track/{token}")
def public_track(token: str, request: Request, response: Response) -> dict:
    """Solo estado del viaje, última posición, expiración y umbral de señal.
    Sin nombres, teléfonos, placa, ruta ni identificadores internos."""
    _rate_limit(token, request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    with tx() as cur:
        link = one(
            cur,
            "SELECT l.*, (l.expires_at <= now()) AS expired, t.status::text AS trip_status "
            "FROM share_links l JOIN trips t ON t.id = l.trip_id WHERE l.token = %s",
            (token,),
        )
        if not link:
            fail(404, "link_not_found", "El enlace no es válido.")
        if link["revoked_at"] is not None:
            fail(410, "link_revoked", "El enlace fue revocado.")
        if link["expired"]:
            fail(410, "link_expired", "El enlace expiró.")
        last = one(
            cur,
            "SELECT * FROM positions WHERE trip_id = %s ORDER BY device_timestamp DESC LIMIT 1",
            (link["trip_id"],),
        )
        limits = serializers.thresholds(cur)
    return {
        "tripStatus": link["trip_status"],
        "lastPosition": (
            {
                "id": str(last["id"]),
                "lat": last["lat"],
                "lng": last["lng"],
                "accuracyMeters": last["accuracy_meters"],
                "deviceTimestamp": last["device_timestamp"],
                "serverTimestamp": last["server_timestamp"],
            }
            if last
            else None
        ),
        "expiresAt": link["expires_at"],
        "signalLossThresholdSeconds": serializers.num(limits.get("signal_loss_seconds", 0)),
    }


@router.get("/files/{token}")
def download_file(token: str) -> FileResponse:
    """La URL la emite POST /drivers/{id}/sensitive-assets tras auditar la consulta."""
    relative = read_file_token(token)
    if not relative:
        fail(410, "file_link_expired", "El enlace al archivo expiró.")
    root = settings.storage_dir.resolve()
    path = (root / relative).resolve()
    if root not in path.parents or not path.is_file():
        fail(404, "not_found", "Archivo no encontrado.")
    return FileResponse(
        path, headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"}
    )
