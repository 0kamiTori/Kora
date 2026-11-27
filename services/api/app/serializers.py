"""Convierte filas de la base de datos al JSON (camelCase) que definen los
tipos TypeScript del portal (src/features/**/**.types.ts)."""
from datetime import datetime, timezone
from typing import Any

from .common import actor_ref, num, thresholds
from .db import many, one

# ---------------------------------------------------------------- Conductoras


def driver_summary(row: dict[str, Any]) -> dict[str, Any]:
    """Interfaz Driver. `row` viene de la vista v_drivers_portal (ya enmascarada)."""
    return {
        "id": str(row["id"]),
        "fullName": row["full_name"],
        "documentNumberMasked": row["document_number_masked"],
        "phoneMasked": row["phone_masked"],
        "status": row["status"],
        "registeredAt": row["registered_at"],
        "vehicle": {
            "plate": row["vehicle_plate"] or "",
            "model": row["vehicle_model"] or "",
            "color": row["vehicle_color"] or "",
        },
        "identityVerification": row["identity_verification"],
        "rejectionReason": row["rejection_reason"],
        "reviewedBy": (
            actor_ref(row["reviewed_by_id"], row["reviewed_by_name"])
            if row["reviewed_by_id"]
            else None
        ),
        "reviewedAt": row["reviewed_at"],
    }


def verification(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "driverId": str(row["driver_id"]),
        "kind": row["kind"],
        "status": row["status"],
        "result": row["result"],
        "score": float(row["score"]) if row["score"] is not None else None,
        "threshold": float(row["threshold"]),
        "modelVersion": row["model_version"],
        "livenessStatus": row["liveness_status"],
        "requestedAt": row["requested_at"],
        "completedAt": row["completed_at"],
        "dueAt": row["due_at"],
    }


def driver_detail(cur, driver_id: Any) -> dict[str, Any] | None:
    """Interfaz DriverDetail. Nunca incluye fotografías ni plantillas (RNF02)."""
    row = one(cur, "SELECT * FROM v_drivers_portal WHERE id = %s", (driver_id,))
    if not row:
        return None
    detail = driver_summary(row)

    consent = one(
        cur,
        "SELECT c.policy_version, c.accepted_at, c.withdrawn_at, c.scopes::text[] AS scopes "
        "FROM consent_records c JOIN drivers d ON d.account_id = c.account_id "
        "WHERE d.id = %s ORDER BY c.accepted_at DESC LIMIT 1",
        (driver_id,),
    )
    detail["consent"] = {
        "policyVersion": consent["policy_version"] if consent else "",
        "acceptedAt": consent["accepted_at"] if consent else row["registered_at"],
        "withdrawnAt": consent["withdrawn_at"] if consent else None,
        "scopes": consent["scopes"] if consent else [],
    }
    detail["verifications"] = [
        verification(item)
        for item in many(
            cur,
            "SELECT * FROM verifications WHERE driver_id = %s ORDER BY requested_at DESC",
            (driver_id,),
        )
    ]
    reference = one(cur, "SELECT * FROM biometric_references WHERE driver_id = %s", (driver_id,))
    detail["biometricReference"] = (
        {
            "id": str(reference["id"]),
            "driverId": str(reference["driver_id"]),
            "createdAt": reference["created_at"],
            "modelVersion": reference["model_version"],
            "hasPhoto": reference["photo_path"] is not None,
            "hasTemplate": reference["template_path"] is not None,
        }
        if reference
        else None
    )
    detail["documents"] = [
        {
            "id": str(item["id"]),
            "label": item["label"],
            "status": item["status"],
            "expiresAt": item["expires_at"],
        }
        for item in many(
            cur,
            "SELECT id, label, status, expires_at FROM driver_documents "
            "WHERE driver_id = %s ORDER BY label",
            (driver_id,),
        )
    ]
    return detail


# --------------------------------------------------------------------- Viajes


def position(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "tripId": str(row["trip_id"]),
        "lat": row["lat"],
        "lng": row["lng"],
        "deviceTimestamp": row["device_timestamp"],
        "serverTimestamp": row["server_timestamp"],
        "accuracyMeters": row["accuracy_meters"],
        "speedKmh": row["speed_kmh"],
    }


TRIP_SELECT = (
    "SELECT t.*, d.full_name AS driver_name, d.identity_verification::text AS driver_verification "
    "FROM trips t LEFT JOIN drivers d ON d.id = t.driver_id "
)


def trip_summary(cur, row: dict[str, Any], limits: dict[str, float] | None = None) -> dict[str, Any]:
    """Interfaz Trip. `row` viene de TRIP_SELECT."""
    limits = limits if limits is not None else thresholds(cur)
    trip_id = row["id"]
    route = one(
        cur,
        "SELECT * FROM reference_routes WHERE trip_id = %s ORDER BY version DESC LIMIT 1",
        (trip_id,),
    )
    changes = (
        many(
            cur,
            "SELECT c.id, c.authorized_at, c.authorized_by, c.reason FROM route_changes c "
            "JOIN reference_routes r ON r.id = c.route_id WHERE r.trip_id = %s "
            "ORDER BY c.authorized_at",
            (trip_id,),
        )
        if route
        else []
    )
    last = one(
        cur,
        "SELECT * FROM positions WHERE trip_id = %s ORDER BY device_timestamp DESC LIMIT 1",
        (trip_id,),
    )
    share = one(
        cur,
        "SELECT 1 FROM share_links WHERE trip_id = %s AND revoked_at IS NULL "
        "AND expires_at > now() LIMIT 1",
        (trip_id,),
    )

    # activeStop solo se informa cuando la parada supera el umbral (parada prolongada).
    active_stop = None
    if row["active_stop_since"] is not None:
        stopped = (datetime.now(timezone.utc) - row["active_stop_since"]).total_seconds()
        if stopped >= limits.get("prolonged_stop_seconds", float("inf")):
            active_stop = {"since": row["active_stop_since"]}

    return {
        "id": str(trip_id),
        "status": row["status"],
        "passengerAlias": row["passenger_alias"],
        "driverId": str(row["driver_id"]) if row["driver_id"] else "",
        "driverName": row["driver_name"] or "Sin asignar",
        "driverVerification": row["driver_verification"] or "pending",
        "origin": {"lat": row["origin_lat"], "lng": row["origin_lng"], "label": row["origin_label"]},
        "destination": {
            "lat": row["destination_lat"],
            "lng": row["destination_lng"],
            "label": row["destination_label"],
        },
        "requestedAt": row["requested_at"],
        "startedAt": row["started_at"],
        "endedAt": row["ended_at"],
        "route": {
            "id": str(route["id"]) if route else "",
            "version": route["version"] if route else 0,
            "points": route["points"] if route else [],
            "distanceMeters": route["distance_meters"] if route else 0,
            "authorizedChanges": [
                {
                    "id": str(item["id"]),
                    "authorizedAt": item["authorized_at"],
                    "authorizedBy": item["authorized_by"],
                    "reason": item["reason"],
                }
                for item in changes
            ],
        },
        "lastPosition": position(last) if last else None,
        "activeDeviation": (
            {"meters": row["active_deviation_meters"], "since": row["active_deviation_since"]}
            if row["active_deviation_meters"] is not None
            else None
        ),
        "activeStop": active_stop,
        "anomalyIndex": row["anomaly_index"],
        "shareLinkActive": share is not None,
    }


def trip_detail(cur, trip_id: Any) -> dict[str, Any] | None:
    """Interfaz TripDetail."""
    row = one(cur, TRIP_SELECT + "WHERE t.id = %s", (trip_id,))
    if not row:
        return None
    detail = trip_summary(cur, row)
    detail["statusHistory"] = [
        {
            "id": str(item["id"]),
            "from": item["from_status"],
            "to": item["to_status"],
            "at": item["changed_at"],
            "actor": item["actor"],
        }
        for item in many(
            cur,
            "SELECT * FROM trip_status_changes WHERE trip_id = %s ORDER BY changed_at",
            (trip_id,),
        )
    ]
    return detail


# -------------------------------------------------------------------- Alertas

ALERT_SELECT = (
    "SELECT a.*, ack.full_name AS acknowledged_by_name, res.full_name AS resolved_by_name "
    "FROM alerts a LEFT JOIN admin_users ack ON ack.id = a.acknowledged_by "
    "LEFT JOIN admin_users res ON res.id = a.resolved_by "
)


def alert(cur, row: dict[str, Any]) -> dict[str, Any]:
    """Interfaz Alert, con su índice de anomalía y sus notificaciones."""
    assessment = one(cur, "SELECT * FROM anomaly_assessments WHERE alert_id = %s", (row["id"],))
    anomaly = None
    if assessment:
        anomaly = {
            "index": assessment["index_value"],
            "level": assessment["level"],
            "computedAt": assessment["computed_at"],
            "modelVersion": assessment["model_version"],
            "factors": [
                {
                    "code": item["code"],
                    "label": item["label"],
                    "description": item["description"],
                    "observed": item["observed"],
                    "weight": float(item["weight"]),
                    "contribution": item["contribution"],
                }
                for item in many(
                    cur,
                    "SELECT * FROM anomaly_factors WHERE assessment_id = %s "
                    "ORDER BY weight DESC, code",
                    (assessment["id"],),
                )
            ],
        }
    deliveries = many(
        cur, "SELECT * FROM alert_deliveries WHERE alert_id = %s ORDER BY id", (row["id"],)
    )
    return {
        "id": str(row["id"]),
        "tripId": str(row["trip_id"]),
        "type": row["type"],
        "severity": row["severity"],
        "status": row["status"],
        "createdAt": row["created_at"],
        "silent": row["silent"],
        "summary": row["summary"],
        "anomaly": anomaly,
        "deliveries": [
            {
                "id": str(item["id"]),
                "channel": item["channel"],
                "destination": item["destination"],
                "attempts": item["attempts"],
                "lastAttemptAt": item["last_attempt_at"],
                "status": item["status"],
                "confirmedAt": item["confirmed_at"],
            }
            for item in deliveries
        ],
        "acknowledgedBy": (
            actor_ref(row["acknowledged_by"], row["acknowledged_by_name"])
            if row["acknowledged_by"]
            else None
        ),
        "acknowledgedAt": row["acknowledged_at"],
        "resolution": (
            {
                "outcome": row["resolution_outcome"],
                "notes": row["resolution_notes"] or "",
                "resolvedBy": actor_ref(row["resolved_by"], row["resolved_by_name"]),
                "resolvedAt": row["resolved_at"],
            }
            if row["status"] == "resolved"
            else None
        ),
    }


def alert_by_id(cur, alert_id: Any) -> dict[str, Any] | None:
    row = one(cur, ALERT_SELECT + "WHERE a.id = %s", (alert_id,))
    return alert(cur, row) if row else None


# ----------------------------------------------------------------- Gobernanza

PARAMETER_SELECT = (
    "SELECT p.*, u.full_name AS updated_by_name FROM parameters p "
    "LEFT JOIN admin_users u ON u.id = p.updated_by "
)


def parameter(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "key": row["param_key"],
        "label": row["label"],
        "description": row["description"],
        "unit": row["unit"],
        "value": num(row["current_value"]),
        "min": num(row["min_value"]),
        "max": num(row["max_value"]),
        "version": row["version"],
        "updatedAt": row["updated_at"],
        "updatedBy": actor_ref(row["updated_by"], row["updated_by_name"]),
    }


def parameter_version(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "key": row["param_key"],
        "version": row["version"],
        "previousValue": num(row["previous_value"]),
        "newValue": num(row["new_value"]),
        "changedBy": actor_ref(row["changed_by"], row["changed_by_name"]),
        "changedAt": row["changed_at"],
        "reason": row["reason"],
    }


def audit_entry(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "at": row["occurred_at"],
        "actor": actor_ref(row["actor_id"], row["actor_name"]),
        "action": row["action"],
        "resourceType": row["resource_type"],
        "resourceId": row["resource_id"],
        "justification": row["justification"],
        "detail": row["detail"],
    }


def privacy_request(cur, row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "type": row["type"],
        "subjectAlias": row["subject_alias"],
        "subjectRole": row["subject_role"],
        "status": row["status"],
        "createdAt": row["created_at"],
        "dueAt": row["due_at"],
        "history": [
            {
                "at": item["occurred_at"],
                "actor": item["actor"],
                "status": item["status"],
                "note": item["note"],
            }
            for item in many(
                cur,
                "SELECT * FROM privacy_request_events WHERE request_id = %s ORDER BY occurred_at",
                (row["id"],),
            )
        ],
    }
