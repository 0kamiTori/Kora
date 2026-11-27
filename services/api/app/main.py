"""Backend de la Plataforma de movilidad segura para mujeres (prototipo académico).

Una sola API y una sola base de datos para el portal admin-web y la app móvil.
Arranque:  uvicorn app.main:app --reload --port 8000   (desde la carpeta backend)
Documentación interactiva: http://localhost:8000/docs
"""
import asyncio
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from . import monitoring
from .config import API_PREFIX, settings
from .db import close_pool, open_pool
from .errors import install_error_handlers
from .realtime import hub, publish_all
from .routers import admin, mobile, public
from .security import admin_from_token

logger = logging.getLogger("movilidad")
SIGNAL_CHECK_SECONDS = 10
WS_AUTH_TIMEOUT_SECONDS = 10


async def _signal_watchdog() -> None:
    """Detecta viajes en curso que dejaron de enviar posiciones (RF07)."""
    while True:
        await asyncio.sleep(SIGNAL_CHECK_SECONDS)
        try:
            publish_all(await asyncio.to_thread(monitoring.check_signal_loss))
        except Exception:
            logger.exception("Falló la revisión de pérdida de señal")


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.require()
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    open_pool()
    hub.bind_loop(asyncio.get_running_loop())
    watchdog = asyncio.create_task(_signal_watchdog())
    try:
        yield
    finally:
        watchdog.cancel()
        close_pool()


app = FastAPI(
    title="Movilidad segura para mujeres - API",
    version="0.1.0",
    description="API compartida por el portal de administración y la app móvil.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,  # el portal envía la cookie httpOnly de renovación
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)
install_error_handlers(app)

app.include_router(admin.router, prefix=API_PREFIX, tags=["Portal de administración"])
app.include_router(public.router, prefix=API_PREFIX, tags=["Público"])
app.include_router(mobile.router, prefix=API_PREFIX, tags=["App móvil"])


@app.get("/health", tags=["Estado"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.websocket("/ws/admin")
async def admin_socket(websocket: WebSocket) -> None:
    """Tiempo real del portal. Tras abrir, el cliente envía
    { "type": "auth", "token": "<token de acceso>", "lastEventId": "<id o null>" }.
    Si el token no es válido se cierra con el código 4401; el portal reconecta
    y vuelve a autenticarse con el token renovado."""
    origin = websocket.headers.get("origin")
    if origin and origin not in settings.cors_origins:
        await websocket.close(code=4403)
        return
    await websocket.accept()
    try:
        raw = await asyncio.wait_for(websocket.receive_text(), WS_AUTH_TIMEOUT_SECONDS)
        message = json.loads(raw)
        token = message.get("token") if isinstance(message, dict) else None
        if not isinstance(message, dict) or message.get("type") != "auth":
            token = None
        admin_user = await asyncio.to_thread(admin_from_token, token)
        if admin_user is None:
            await websocket.close(code=4401)
            return
        permissions = set(admin_user.permissions)
        for event in hub.events_after(message.get("lastEventId"), permissions):
            await websocket.send_text(json.dumps(event))
        hub.add(websocket, permissions)
        while True:
            await websocket.receive_text()  # el cliente no envía nada más
    except (WebSocketDisconnect, asyncio.TimeoutError, ValueError):
        pass
    finally:
        hub.remove(websocket)
