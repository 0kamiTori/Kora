"""Monitoreo de viajes (RF07, RF08, RF09): desviación de ruta, parada
prolongada, pérdida de señal, índice operativo de anomalía y creación de alertas.

El índice de anomalía resume señales OPERATIVAS del viaje. No es una
probabilidad de delito ni una predicción sobre personas.

SUPUESTOS (ajustar cuando el SRS los fije): pesos de los factores, cortes de
nivel (34 / 67), velocidad de "detenido" (< 3 km/h), radio de exclusión de
paradas junto al origen y destino (80 m) y espera entre alertas repetidas.
"""
from datetime import timedelta
from typing import Any

from .common import thresholds
from .db import many, one, tx
from .geo import distance_to_polyline_m, haversine_m
from .security import now_utc

MODEL_VERSION = "anomaly-rules-0.1"
STOPPED_SPEED_KMH = 3.0
STOPPED_DISTANCE_M = 10.0
ENDPOINT_RADIUS_M = 80.0
REPEAT_ALERT_MINUTES = 10

SEVERITY = {
    "silent_alert": "critical",
    "help_button": "critical",
    "route_deviation": "high",
    "signal_loss": "high",
    "verification_failed": "high",
    "anomaly_index": "high",
    "prolonged_stop": "medium",
}

Events = list[tuple[str, Any]]


def assess(
    deviation_m: float | None,
    stop_seconds: float,
    signal_lost: bool,
    driver_verification: str | None,
    limits: dict[str, float],
) -> dict[str, Any]:
    """Índice 0..100 = suma de los aportes de cada factor."""
    dev_limit = limits["route_deviation_meters"]
    stop_limit = limits["prolonged_stop_seconds"]

    dev_points = round(45 * min(1.0, deviation_m / (3 * dev_limit))) if deviation_m else 0
    verification_points = 0 if driver_verification == "confirmed" else 30
    signal_points = 15 if signal_lost else 0
    stop_points = (
        round(10 * min(1.0, stop_seconds / (2 * stop_limit))) if stop_seconds >= stop_limit else 0
    )

    factors = [
        {
            "code": "route_deviation",
            "label": "Desviación de la ruta de referencia",
            "description": "Distancia entre la posición actual y el punto más cercano de la ruta acordada.",
            "observed": f"{round(deviation_m)} m" if deviation_m else "Dentro de la ruta",
            "weight": 0.45,
            "contribution": dev_points,
        },
        {
            "code": "driver_verification",
            "label": "Verificación de la conductora no vigente",
            "description": "Estado de la última verificación de identidad de la conductora.",
            "observed": "Confirmada" if driver_verification == "confirmed" else "No confirmada",
            "weight": 0.30,
            "contribution": verification_points,
        },
        {
            "code": "signal_loss",
            "label": "Pérdida de señal GPS",
            "description": "No se reciben posiciones dentro del umbral configurado.",
            "observed": "Sin señal" if signal_lost else "Con señal",
            "weight": 0.15,
            "contribution": signal_points,
        },
        {
            "code": "prolonged_stop",
            "label": "Parada prolongada",
            "description": "Tiempo detenido fuera del origen y del destino.",
            "observed": f"{round(stop_seconds)} s" if stop_points else "Sin paradas",
            "weight": 0.10,
            "contribution": stop_points,
        },
    ]
    index = sum(item["contribution"] for item in factors)
    level = "low" if index < 34 else "medium" if index < 67 else "high"
    return {"index": index, "level": level, "factors": factors}


def create_alert(
    cur,
    events: Events,
    trip_id: Any,
    alert_type: str,
    summary: str,
    anomaly: dict[str, Any] | None = None,
) -> str:
    cur.execute(
        "INSERT INTO alerts (trip_id, type, severity, silent, summary) "
        "VALUES (%s, %s, %s, %s, %s) RETURNING id",
        (trip_id, alert_type, SEVERITY[alert_type], alert_type == "silent_alert", summary),
    )
    alert_id = cur.fetchone()["id"]
    # Única notificación real del prototipo: el propio portal, por WebSocket.
    # Queda en 'sent' (no 'delivered') porque no hay acuse de recibo (RNF03).
    # Push y SMS no están integrados: no se registran entregas que no ocurrieron.
    cur.execute(
        "INSERT INTO alert_deliveries (alert_id, channel, destination, attempts, "
        "last_attempt_at, status) VALUES (%s, 'admin_portal', 'Portal de administración', 1, now(), 'sent')",
        (alert_id,),
    )
    if anomaly is not None:
        cur.execute(
            "INSERT INTO anomaly_assessments (alert_id, index_value, level, model_version) "
            "VALUES (%s, %s, %s, %s) RETURNING id",
            (alert_id, anomaly["index"], anomaly["level"], MODEL_VERSION),
        )
        assessment_id = cur.fetchone()["id"]
        for factor in anomaly["factors"]:
            cur.execute(
                "INSERT INTO anomaly_factors (assessment_id, code, label, description, observed, "
                "weight, contribution) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (
                    assessment_id,
                    factor["code"],
                    factor["label"],
                    factor["description"],
                    factor["observed"],
                    factor["weight"],
                    factor["contribution"],
                ),
            )
    events.append(("alert.created", {"id": str(alert_id)}))
    return str(alert_id)


def _can_raise(cur, trip_id: Any, alert_type: str) -> bool:
    """Evita repetir la misma alerta mientras siga abierta o sea muy reciente."""
    existing = one(
        cur,
        "SELECT 1 FROM alerts WHERE trip_id = %s AND type = %s "
        "AND (status <> 'resolved' OR created_at > %s) LIMIT 1",
        (trip_id, alert_type, now_utc() - timedelta(minutes=REPEAT_ALERT_MINUTES)),
    )
    return existing is None


def process_latest_position(cur, events: Events, trip_id: Any) -> None:
    """Recalcula desviación, parada e índice tras recibir posiciones de un viaje."""
    trip = one(
        cur,
        "SELECT t.*, d.identity_verification::text AS driver_verification FROM trips t "
        "LEFT JOIN drivers d ON d.id = t.driver_id WHERE t.id = %s FOR UPDATE OF t",
        (trip_id,),
    )
    if not trip or trip["status"] != "in_progress":
        return
    recent = many(
        cur,
        "SELECT * FROM positions WHERE trip_id = %s ORDER BY device_timestamp DESC LIMIT 2",
        (trip_id,),
    )
    if not recent:
        return
    latest = recent[0]
    previous = recent[1] if len(recent) > 1 else None
    limits = thresholds(cur)
    route = one(
        cur,
        "SELECT points FROM reference_routes WHERE trip_id = %s ORDER BY version DESC LIMIT 1",
        (trip_id,),
    )

    # --- Desviación de la ruta de referencia ---
    distance = distance_to_polyline_m(latest["lat"], latest["lng"], route["points"] if route else [])
    deviating = distance > limits["route_deviation_meters"]
    deviation_meters = round(distance) if deviating else None
    deviation_since = (
        (trip["active_deviation_since"] or latest["server_timestamp"]) if deviating else None
    )

    # --- Parada (cuenta desde que el vehículo se detiene) ---
    if latest["speed_kmh"] is not None:
        stationary = latest["speed_kmh"] < STOPPED_SPEED_KMH
    else:
        stationary = previous is not None and (
            haversine_m(latest["lat"], latest["lng"], previous["lat"], previous["lng"])
            < STOPPED_DISTANCE_M
        )
    near_endpoint = (
        haversine_m(latest["lat"], latest["lng"], trip["origin_lat"], trip["origin_lng"])
        < ENDPOINT_RADIUS_M
        or haversine_m(latest["lat"], latest["lng"], trip["destination_lat"], trip["destination_lng"])
        < ENDPOINT_RADIUS_M
    )
    stop_since = None
    stop_seconds = 0.0
    if stationary and not near_endpoint:
        stop_since = trip["active_stop_since"] or latest["device_timestamp"]
        stop_seconds = max(0.0, (latest["device_timestamp"] - stop_since).total_seconds())
    prolonged = stop_seconds >= limits["prolonged_stop_seconds"]

    anomaly = assess(
        float(deviation_meters) if deviating else None,
        stop_seconds,
        False,  # acaba de llegar una posición: hay señal
        trip["driver_verification"],
        limits,
    )

    cur.execute(
        "UPDATE trips SET active_deviation_meters = %s, active_deviation_since = %s, "
        "active_stop_since = %s, anomaly_index = %s WHERE id = %s",
        (deviation_meters, deviation_since, stop_since, anomaly["index"], trip_id),
    )

    if deviating and _can_raise(cur, trip_id, "route_deviation"):
        create_alert(
            cur,
            events,
            trip_id,
            "route_deviation",
            "El vehículo se apartó de la ruta de referencia por encima del umbral configurado.",
            anomaly,
        )
    if prolonged and _can_raise(cur, trip_id, "prolonged_stop"):
        create_alert(
            cur,
            events,
            trip_id,
            "prolonged_stop",
            "El vehículo permaneció detenido más tiempo que el umbral configurado.",
            anomaly,
        )

    changed = (
        deviation_meters != trip["active_deviation_meters"]
        or (stop_since is None) != (trip["active_stop_since"] is None)
        or prolonged
        or anomaly["index"] != trip["anomaly_index"]
    )
    if changed:
        events.append(("trip.updated", {"id": str(trip_id)}))


def check_signal_loss() -> Events:
    """Lo ejecuta una tarea periódica: viajes en curso sin posiciones recientes."""
    events: Events = []
    with tx() as cur:
        limits = thresholds(cur)
        cutoff = now_utc() - timedelta(seconds=limits["signal_loss_seconds"])
        silent_trips = many(
            cur,
            "SELECT t.*, d.identity_verification::text AS driver_verification FROM trips t "
            "LEFT JOIN drivers d ON d.id = t.driver_id "
            "WHERE t.status = 'in_progress' AND COALESCE("
            "  (SELECT max(p.server_timestamp) FROM positions p WHERE p.trip_id = t.id),"
            "  t.started_at) < %s",
            (cutoff,),
        )
        for trip in silent_trips:
            if not _can_raise(cur, trip["id"], "signal_loss"):
                continue
            anomaly = assess(
                float(trip["active_deviation_meters"])
                if trip["active_deviation_meters"] is not None
                else None,
                0.0,
                True,
                trip["driver_verification"],
                limits,
            )
            cur.execute(
                "UPDATE trips SET anomaly_index = %s WHERE id = %s", (anomaly["index"], trip["id"])
            )
            create_alert(
                cur,
                events,
                trip["id"],
                "signal_loss",
                "No se reciben posiciones del viaje dentro del umbral configurado.",
                anomaly,
            )
            events.append(("trip.updated", {"id": str(trip["id"])}))
    return events
