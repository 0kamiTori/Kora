"""Prueba de integración de punta a punta: la app móvil registra datos y el
portal los ve y los gestiona sobre la misma base de datos."""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from conftest import TEST_ADMIN_PASSWORD as PILOT_PASSWORD

API = "/api/v1"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64  # contenido de prueba, no una imagen real

# Ruta de referencia: una recta de ~1,1 km hacia el este, en Bucaramanga.
ORIGIN = {"label": "Parque Santander", "lat": 7.1193, "lng": -73.1227}
DESTINATION = {"label": "Cabecera del Llano", "lat": 7.1193, "lng": -73.1127}


def unique(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def admin_headers(client: TestClient, email: str) -> dict[str, str]:
    response = client.post(f"{API}/auth/login", json={"email": email, "password": PILOT_PASSWORD})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['accessToken']}"}


def bearer(session: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {session['accessToken']}"}


def register_driver(client: TestClient) -> tuple[dict, dict]:
    digits = str(uuid.uuid4().int)[:10]
    form = {
        "email": f"{unique('conductora')}@prueba.test",
        "password": "Clave-segura-1",
        "policyVersion": "v1.0",
        "consentScopes": ["location", "biometric", "notifications"],
        "fullName": "Laura Méndez Rojas",
        "documentType": "CC",
        "documentNumber": digits,
        "phone": "300" + digits[:7],
        "vehicle": {"plate": f"T{digits[:5]}", "model": "Renault Kwid 2022", "color": "Gris"},
    }
    response = client.post(f"{API}/mobile/auth/register/driver", json=form)
    assert response.status_code == 201, response.text
    return form, response.json()


def register_passenger(client: TestClient) -> dict:
    response = client.post(
        f"{API}/mobile/auth/register/passenger",
        json={
            "email": f"{unique('pasajera')}@prueba.test",
            "password": "Clave-segura-1",
            "policyVersion": "v1.0",
            "consentScopes": ["location", "trusted_contact_sharing"],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def position(lat: float, lng: float, speed: float = 30.0) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "lat": lat,
        "lng": lng,
        "deviceTimestamp": datetime.now(timezone.utc).isoformat(),
        "accuracyMeters": 8,
        "speedKmh": speed,
    }


def approved_driver(client: TestClient) -> tuple[dict, str]:
    """Inscribe una conductora desde la app y la aprueba desde el portal."""
    _, session = register_driver(client)
    detail = client.put(
        f"{API}/mobile/driver/biometric-reference",
        headers=bearer(session),
        files={"photo": ("foto.png", PNG, "image/png")},
    )
    assert detail.status_code == 200, detail.text
    driver_id = detail.json()["id"]
    review = client.post(
        f"{API}/drivers/{driver_id}/review",
        headers=admin_headers(client, "verificadora@piloto.test"),
        json={"decision": "approve"},
    )
    assert review.status_code == 200, review.text
    return session, driver_id


# ------------------------------------------------------------------ Sesión


def test_sesion_del_portal(client: TestClient):
    bad = client.post(f"{API}/auth/login", json={"email": "admin@piloto.test", "password": "x"})
    assert bad.status_code == 401 and bad.json()["code"] == "invalid_credentials"

    login = client.post(
        f"{API}/auth/login", json={"email": "admin@piloto.test", "password": PILOT_PASSWORD}
    )
    assert login.status_code == 200
    body = login.json()
    assert body["user"]["role"] == "super_admin" and len(body["user"]["permissions"]) == 12
    assert "httponly" in login.headers["set-cookie"].lower()

    assert client.post(f"{API}/auth/refresh").json()["user"]["email"] == "admin@piloto.test"
    assert client.post(f"{API}/auth/logout").status_code == 204
    expired = client.post(f"{API}/auth/refresh")
    assert expired.status_code == 401 and expired.json()["code"] == "session_expired"


def test_permisos_por_rol(client: TestClient):
    assert client.get(f"{API}/drivers").status_code == 401
    operator = admin_headers(client, "operadora@piloto.test")
    assert client.get(f"{API}/trips", headers=operator).status_code == 200
    denied = client.get(f"{API}/audit-log", headers=operator)
    assert denied.status_code == 403 and denied.json()["code"] == "forbidden"
    # Un token de la app móvil no sirve en el portal.
    passenger = register_passenger(client)
    assert client.get(f"{API}/drivers", headers=bearer(passenger)).status_code == 401


# ------------------------------------------------- Inscripción de conductora


def test_inscripcion_movil_aparece_en_el_portal(client: TestClient):
    form, session = register_driver(client)
    verifier = admin_headers(client, "verificadora@piloto.test")

    listed = client.get(f"{API}/drivers", headers=verifier).json()
    mine = next(item for item in listed if item["vehicle"]["plate"] == form["vehicle"]["plate"])
    assert mine["fullName"] == form["fullName"]
    assert mine["status"] == "pending_review" and mine["identityVerification"] == "pending"
    # Documento y teléfono llegan enmascarados: nunca completos.
    assert mine["documentNumberMasked"] == f"CC ··· {form['documentNumber'][-4:]}"
    assert form["documentNumber"] not in str(mine) and form["phone"] not in str(mine)

    driver_id = mine["id"]
    detail = client.get(f"{API}/drivers/{driver_id}", headers=verifier).json()
    assert sorted(detail["consent"]["scopes"]) == ["biometric", "location", "notifications"]
    assert {doc["label"] for doc in detail["documents"]} == {
        "Licencia de conducción",
        "SOAT",
        "Revisión técnico-mecánica",
    }
    assert detail["biometricReference"] is None
    assert detail["verifications"][0]["kind"] == "enrollment"

    # Sin identidad confirmada no se puede aprobar.
    early = client.post(
        f"{API}/drivers/{driver_id}/review", headers=verifier, json={"decision": "approve"}
    )
    assert early.status_code == 409 and early.json()["code"] == "verification_not_confirmed"
    # Un rechazo exige motivo.
    no_reason = client.post(
        f"{API}/drivers/{driver_id}/review", headers=verifier, json={"decision": "reject"}
    )
    assert no_reason.status_code == 422 and no_reason.json()["code"] == "reason_required"

    # La app sube un documento y la fotografía de referencia.
    document = client.put(
        f"{API}/mobile/driver/documents",
        headers=bearer(session),
        data={"label": "SOAT", "expiresAt": "2027-06-30T00:00:00Z"},
        files={"file": ("soat.png", PNG, "image/png")},
    )
    assert document.status_code == 200, document.text
    photo = client.put(
        f"{API}/mobile/driver/biometric-reference",
        headers=bearer(session),
        files={"photo": ("foto.png", PNG, "image/png")},
    )
    assert photo.status_code == 200, photo.text
    assert photo.json()["identityVerification"] == "confirmed"
    assert photo.json()["biometricReference"]["hasPhoto"] is True

    # Dato sensible: exige justificación, queda auditado y entrega una URL temporal.
    asset_url = f"{API}/drivers/{driver_id}/sensitive-assets"
    missing = client.post(asset_url, headers=verifier, json={"kind": "photo", "justification": "x"})
    assert missing.status_code == 422 and missing.json()["code"] == "justification_required"
    asset = client.post(
        asset_url,
        headers=verifier,
        json={"kind": "photo", "justification": "Revisión manual de la solicitud de inscripción."},
    )
    assert asset.status_code == 200, asset.text
    content = client.get(asset.json()["contentUrl"])
    assert content.status_code == 200 and content.content == PNG

    approved = client.post(
        f"{API}/drivers/{driver_id}/review", headers=verifier, json={"decision": "approve"}
    )
    assert approved.status_code == 200 and approved.json()["status"] == "approved"
    assert approved.json()["reviewedBy"]["name"] == "Viviana Torres"
    again = client.post(
        f"{API}/drivers/{driver_id}/review", headers=verifier, json={"decision": "approve"}
    )
    assert again.status_code == 409

    # La conductora ve su estado en la app, y todo quedó en la bitácora.
    assert client.get(f"{API}/mobile/driver/me", headers=bearer(session)).json()["status"] == "approved"
    audit = client.get(f"{API}/audit-log", headers=admin_headers(client, "auditora@piloto.test")).json()
    actions = {entry["action"] for entry in audit if entry["resourceId"] == driver_id}
    assert actions == {"sensitive.photo_viewed", "driver.approved"}
    viewed = next(entry for entry in audit if entry["id"] == asset.json()["auditEntryId"])
    assert viewed["justification"].startswith("Revisión manual")


def test_datos_duplicados_en_la_inscripcion(client: TestClient):
    form, _ = register_driver(client)
    repeated = client.post(f"{API}/mobile/auth/register/driver", json=form)
    assert repeated.status_code == 409 and repeated.json()["code"] == "email_taken"
    no_consent = {**form, "email": f"{unique('otra')}@prueba.test", "consentScopes": ["location"]}
    response = client.post(f"{API}/mobile/auth/register/driver", json=no_consent)
    assert response.status_code == 422 and response.json()["code"] == "consent_required"


# -------------------------------------------------------- Viaje y monitoreo


def test_viaje_monitoreo_alertas_y_enlace_publico(client: TestClient):
    driver, driver_id = approved_driver(client)
    passenger = register_passenger(client)
    operator = admin_headers(client, "operadora@piloto.test")
    operator_token = operator["Authorization"].split(" ", 1)[1]

    trip = client.post(
        f"{API}/mobile/trips",
        headers=bearer(passenger),
        json={"origin": ORIGIN, "destination": DESTINATION},
    )
    assert trip.status_code == 201, trip.text
    trip_id = trip.json()["id"]
    second = client.post(
        f"{API}/mobile/trips",
        headers=bearer(passenger),
        json={"origin": ORIGIN, "destination": DESTINATION},
    )
    assert second.status_code == 409 and second.json()["code"] == "trip_in_course"

    available = client.get(f"{API}/mobile/trips/available", headers=bearer(driver)).json()
    assert trip_id in {item["id"] for item in available}
    accepted = client.post(f"{API}/mobile/trips/{trip_id}/accept", headers=bearer(driver))
    assert accepted.status_code == 200 and accepted.json()["vehicle"]["model"] == "Renault Kwid 2022"

    # Transición inválida: no se puede finalizar un viaje que no ha iniciado.
    skip = client.post(
        f"{API}/mobile/trips/{trip_id}/status", headers=bearer(driver), json={"status": "completed"}
    )
    assert skip.status_code == 409 and skip.json()["code"] == "invalid_transition"
    for status in ("driver_arriving", "in_progress"):
        moved = client.post(
            f"{API}/mobile/trips/{trip_id}/status", headers=bearer(driver), json={"status": status}
        )
        assert moved.status_code == 200, moved.text

    with client.websocket_connect("/ws/admin") as socket:
        socket.send_json({"type": "auth", "token": operator_token, "lastEventId": None})

        # Posición sobre la ruta: sin novedades. Reenviarla no la duplica.
        on_route = position(7.1193, -73.1200)
        sent = client.post(
            f"{API}/mobile/trips/{trip_id}/positions",
            headers=bearer(driver),
            json={"positions": [on_route]},
        )
        assert sent.json() == {"accepted": 1, "duplicates": 0}
        event = socket.receive_json()
        assert event["type"] == "position.updated" and event["payload"]["id"] == on_route["id"]
        assert socket.receive_json()["type"] == "trip.updated"  # primer índice de anomalía
        resent = client.post(
            f"{API}/mobile/trips/{trip_id}/positions",
            headers=bearer(driver),
            json={"positions": [on_route]},
        )
        assert resent.json() == {"accepted": 0, "duplicates": 1}

        monitored = client.get(f"{API}/trips/{trip_id}", headers=operator).json()
        assert monitored["status"] == "in_progress" and monitored["activeDeviation"] is None
        assert monitored["driverId"] == driver_id and monitored["anomalyIndex"] == 0
        assert [change["to"] for change in monitored["statusHistory"]] == [
            "requested",
            "accepted",
            "driver_arriving",
            "in_progress",
        ]

        # Posición ~330 m al norte de la ruta: supera el umbral de 100 m.
        off_route = position(7.1223, -73.1180)
        client.post(
            f"{API}/mobile/trips/{trip_id}/positions",
            headers=bearer(driver),
            json={"positions": [off_route]},
        )
        received = [socket.receive_json()["type"] for _ in range(3)]
        assert received == ["position.updated", "alert.created", "trip.updated"]

    listed = client.get(f"{API}/trips", headers=operator, params={"scope": "active"}).json()
    current = next(item for item in listed if item["id"] == trip_id)
    assert 300 <= current["activeDeviation"]["meters"] <= 360
    assert current["anomalyIndex"] > 0

    alerts = client.get(f"{API}/alerts", headers=operator).json()
    deviation = next(a for a in alerts if a["tripId"] == trip_id and a["type"] == "route_deviation")
    assert deviation["severity"] == "high" and deviation["status"] == "open"
    # La suma de los aportes de los factores iguala el índice.
    anomaly = deviation["anomaly"]
    assert sum(factor["contribution"] for factor in anomaly["factors"]) == anomaly["index"]
    # Sin acuse de recibo no se informa "delivered".
    assert all(d["status"] != "delivered" or d["confirmedAt"] for d in deviation["deliveries"])

    # Recorrido histórico: dato sensible, exige justificación.
    history_url = f"{API}/trips/{trip_id}/position-history"
    assert client.post(history_url, headers=operator, json={}).status_code == 422
    history = client.post(
        history_url, headers=operator, json={"justification": "Revisión de la alerta de desviación."}
    )
    assert [item["id"] for item in history.json()] == [on_route["id"], off_route["id"]]

    # Botón de ayuda desde la app: llega al portal y repetirlo no duplica.
    helped = client.post(
        f"{API}/mobile/trips/{trip_id}/alerts", headers=bearer(passenger), json={"type": "help_button"}
    )
    assert helped.status_code == 201
    repeated = client.post(
        f"{API}/mobile/trips/{trip_id}/alerts", headers=bearer(passenger), json={"type": "help_button"}
    )
    assert repeated.json()["id"] == helped.json()["id"]
    alert_id = helped.json()["id"]
    acknowledged = client.post(f"{API}/alerts/{alert_id}/acknowledge", headers=operator).json()
    assert acknowledged["status"] == "acknowledged"
    assert acknowledged["acknowledgedBy"]["name"] == "Natalia Cárdenas"
    short = client.post(
        f"{API}/alerts/{alert_id}/resolve", headers=operator, json={"outcome": "other", "notes": "ok"}
    )
    assert short.status_code == 422 and short.json()["code"] == "notes_required"
    resolved = client.post(
        f"{API}/alerts/{alert_id}/resolve",
        headers=operator,
        json={"outcome": "contact_established", "notes": "Se contactó a la pasajera y está bien."},
    ).json()
    assert resolved["status"] == "resolved"
    assert resolved["resolution"]["outcome"] == "contact_established"

    # Enlace del Contacto de Confianza: solo datos mínimos, y se puede revocar.
    link = client.post(
        f"{API}/mobile/trips/{trip_id}/share-link", headers=bearer(passenger), json={}
    )
    assert link.status_code == 201, link.text
    token = link.json()["token"]
    public = client.get(f"{API}/public/track/{token}")
    assert public.status_code == 200 and public.headers["cache-control"] == "no-store"
    view = public.json()
    assert set(view) == {"tripStatus", "lastPosition", "expiresAt", "signalLossThresholdSeconds"}
    assert set(view["lastPosition"]) == {
        "id",
        "lat",
        "lng",
        "accuracyMeters",
        "deviceTimestamp",
        "serverTimestamp",
    }
    assert view["signalLossThresholdSeconds"] == 30
    assert client.get(f"{API}/trips/{trip_id}", headers=operator).json()["shareLinkActive"] is True
    assert client.get(f"{API}/public/track/no-existe").json()["code"] == "link_not_found"
    client.delete(f"{API}/mobile/trips/{trip_id}/share-link", headers=bearer(passenger))
    revoked = client.get(f"{API}/public/track/{token}")
    assert revoked.status_code == 410 and revoked.json()["code"] == "link_revoked"

    # Otra pasajera no puede ver un viaje ajeno.
    stranger = register_passenger(client)
    assert client.get(f"{API}/mobile/trips/{trip_id}", headers=bearer(stranger)).status_code == 403

    finished = client.post(
        f"{API}/mobile/trips/{trip_id}/status", headers=bearer(driver), json={"status": "completed"}
    ).json()
    assert finished["status"] == "completed" and finished["activeDeviation"] is None
    recent = client.get(f"{API}/trips", headers=operator, params={"scope": "recent"}).json()
    assert trip_id in {item["id"] for item in recent}


def test_perdida_de_senal(client: TestClient):
    from app import monitoring
    from app.db import tx

    driver, _ = approved_driver(client)
    passenger = register_passenger(client)
    trip_id = client.post(
        f"{API}/mobile/trips",
        headers=bearer(passenger),
        json={"origin": ORIGIN, "destination": DESTINATION},
    ).json()["id"]
    client.post(f"{API}/mobile/trips/{trip_id}/accept", headers=bearer(driver))
    for status in ("driver_arriving", "in_progress"):
        client.post(
            f"{API}/mobile/trips/{trip_id}/status", headers=bearer(driver), json={"status": status}
        )
    operator = admin_headers(client, "operadora@piloto.test")

    def signal_alerts() -> list[dict]:
        alerts = client.get(f"{API}/alerts", headers=operator).json()
        return [a for a in alerts if a["tripId"] == trip_id and a["type"] == "signal_loss"]

    monitoring.check_signal_loss()
    assert signal_alerts() == []  # recién iniciado: aún dentro del umbral

    with tx() as cur:  # simula 2 minutos sin posiciones
        cur.execute(
            "UPDATE trips SET started_at = %s WHERE id = %s",
            (datetime.now(timezone.utc) - timedelta(minutes=2), trip_id),
        )
    # La tarea periódica del servidor puede adelantarse; el resultado es el mismo.
    monitoring.check_signal_loss()
    monitoring.check_signal_loss()
    lost = signal_alerts()
    assert len(lost) == 1  # no se repite mientras siga abierta
    assert lost[0]["severity"] == "high" and lost[0]["anomaly"]["index"] == 15


# ------------------------------------------------- Parámetros y privacidad


def test_parametros_versionados(client: TestClient):
    admin = admin_headers(client, "admin@piloto.test")
    auditor = admin_headers(client, "auditora@piloto.test")
    key = "prolonged_stop_seconds"
    url = f"{API}/parameters/{key}"

    current = next(p for p in client.get(f"{API}/parameters", headers=auditor).json() if p["key"] == key)
    new_value = 200 if current["value"] != 200 else 210
    body = {"value": new_value, "reason": "Ajuste acordado para la prueba piloto."}

    assert client.put(url, headers=auditor, json=body).status_code == 403
    out_of_range = client.put(url, headers=admin, json={**body, "value": 5})
    assert out_of_range.status_code == 422 and out_of_range.json()["code"] == "invalid_value"
    no_reason = client.put(url, headers=admin, json={"value": new_value, "reason": ""})
    assert no_reason.json()["code"] == "reason_required"

    updated = client.put(url, headers=admin, json=body).json()
    assert updated["value"] == new_value and updated["version"] == current["version"] + 1
    assert updated["updatedBy"]["name"] == "Andrea Salcedo"
    versions = client.get(f"{url}/versions", headers=auditor).json()
    assert versions[0]["previousValue"] == current["value"] and versions[0]["newValue"] == new_value
    assert versions[-1]["changedBy"] == {"id": "system", "name": "Sistema"}


def test_solicitud_de_datos_personales(client: TestClient):
    passenger = register_passenger(client)
    created = client.post(
        f"{API}/mobile/privacy-requests",
        headers=bearer(passenger),
        json={"type": "consent_withdrawal"},
    )
    assert created.status_code == 201, created.text
    request_id = created.json()["id"]

    auditor = admin_headers(client, "auditora@piloto.test")
    listed = client.get(f"{API}/privacy-requests", headers=auditor).json()
    mine = next(item for item in listed if item["id"] == request_id)
    assert mine["status"] == "received" and mine["subjectRole"] == "passenger"

    url = f"{API}/privacy-requests/{request_id}/status"
    jump = client.post(url, headers=auditor, json={"status": "completed", "note": "Cierre directo."})
    assert jump.status_code == 409 and jump.json()["code"] == "invalid_transition"
    for status in ("in_review", "completed"):
        step = client.post(
            url, headers=auditor, json={"status": status, "note": "Identidad del titular confirmada."}
        )
        assert step.status_code == 200, step.text
    assert [event["status"] for event in step.json()["history"]] == [
        "received",
        "in_review",
        "completed",
    ]
    # La titular ve el resultado en la app, y ya no puede compartir su viaje.
    own = client.get(f"{API}/mobile/privacy-requests", headers=bearer(passenger)).json()
    assert own[0]["status"] == "completed"
