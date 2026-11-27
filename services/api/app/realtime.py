"""Eventos en tiempo real hacia el portal por WebSocket (RNF03, RNF04).

Cada mensaje es un sobre { eventId, type, emittedAt, payload }. Se guardan los
últimos eventos en memoria para reenviarlos a un cliente que reconecta con
`lastEventId`.

LIMITACIÓN: el estado vive en memoria de un solo proceso. Para ejecutar varios
procesos (uvicorn --workers > 1) hay que sustituirlo por Redis u otro bus.
"""
import asyncio
import json
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder

# Permiso necesario para recibir cada tipo de evento (RNF01).
EVENT_PERMISSIONS = {
    "position.updated": "trips:monitor",
    "trip.updated": "trips:monitor",
    "alert.created": "alerts:view",
    "alert.updated": "alerts:view",
}


def _allowed(envelope: dict[str, Any], permissions: set[str]) -> bool:
    required = EVENT_PERMISSIONS.get(envelope["type"])
    return required is not None and required in permissions


class RealtimeHub:
    def __init__(self, history: int = 500) -> None:
        self._clients: dict[WebSocket, set[str]] = {}
        self._history: deque[dict[str, Any]] = deque(maxlen=history)
        self._loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def events_after(self, last_event_id: str | None, permissions: set[str]) -> list[dict[str, Any]]:
        """Eventos posteriores a `last_event_id` que el cliente puede ver."""
        if not last_event_id:
            return []
        events = list(self._history)
        for index, event in enumerate(events):
            if event["eventId"] == last_event_id:
                return [item for item in events[index + 1 :] if _allowed(item, permissions)]
        return []

    def add(self, websocket: WebSocket, permissions: set[str]) -> None:
        self._clients[websocket] = permissions

    def remove(self, websocket: WebSocket) -> None:
        self._clients.pop(websocket, None)

    def publish(self, event_type: str, payload: Any) -> None:
        """Se puede llamar desde cualquier hilo (los endpoints corren en hilos)."""
        envelope = {
            "eventId": str(uuid.uuid4()),
            "type": event_type,
            "emittedAt": datetime.now(timezone.utc).isoformat(),
            "payload": jsonable_encoder(payload),
        }
        self._history.append(envelope)
        loop = self._loop
        if loop is not None and loop.is_running():
            loop.call_soon_threadsafe(lambda: loop.create_task(self._broadcast(envelope)))

    async def _broadcast(self, envelope: dict[str, Any]) -> None:
        message = json.dumps(envelope)
        for client, permissions in list(self._clients.items()):
            if not _allowed(envelope, permissions):
                continue
            try:
                await client.send_text(message)
            except Exception:
                self._clients.pop(client, None)


hub = RealtimeHub()


def publish_all(events: list[tuple[str, Any]]) -> None:
    """Publica los eventos acumulados DESPUÉS de confirmar la transacción."""
    for event_type, payload in events:
        hub.publish(event_type, payload)
