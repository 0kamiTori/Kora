import logging
from contextlib import asynccontextmanager
from datetime import datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from kora_api.config import Settings
from kora_api.database import Database

logger = logging.getLogger("kora_api")
REGISTRATION_ERROR = "Hubo un error para registrate, intentalo nuevamente más tarde"


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    database = Database(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        database.dispose()

    app = FastAPI(
        title="Köra API base",
        version="0.1.0",
        description="API01: infraestructura y registro cerrado; no implementa altas ni sesiones.",
        docs_url="/docs" if settings.app_env in {"local", "test"} else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.app_env in {"local", "test"} else None,
        lifespan=lifespan,
    )
    app.state.database = database
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.hosts)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Idempotency-Key"],
    )

    @app.middleware("http")
    async def safe_boundary(request: Request, call_next):
        request.state.request_id = str(uuid4())
        try:
            response = await call_next(request)
        except Exception as error:
            incident_id = str(uuid4())
            logger.error(
                "event=unhandled_error request_id=%s incident_id=%s error_type=%s",
                request.state.request_id,
                incident_id,
                type(error).__name__,
            )
            response = JSONResponse(
                status_code=500,
                content={
                    "code": "INTERNAL_ERROR",
                    "message": REGISTRATION_ERROR,
                    "request_id": request.state.request_id,
                    "retryable": True,
                    "field_errors": [],
                    "incident_id": incident_id,
                },
            )
        response.headers["X-Request-ID"] = request.state.request_id
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/health/live")
    def live():
        return {"status": "alive"}

    @app.get("/health/ready")
    def ready():
        success = database.is_ready()
        return JSONResponse(
            status_code=200 if success else 503,
            content={"status": "ready" if success else "not_ready"},
        )

    @app.get("/api/v2/registration-policy", operation_id="getRegistrationPolicyV2")
    def registration_policy():
        return {
            "policy_version": "api01-registration-closed",
            "registration_enabled": False,
            "server_date": datetime.now(ZoneInfo("America/Bogota")).date().isoformat(),
            "minimum_age": 18,
            "display_name_max_length": 100,
            "password_rules": {
                "minimum_length": 12,
                "uppercase": True,
                "lowercase": True,
                "digit": True,
                "special_character": True,
            },
            "consent": None,
        }

    @app.post("/api/v2/accounts", operation_id="registerAccountV2", status_code=503)
    def registration_closed(request: Request):
        # Do not read credentials, write accounts or seed fictional approvals.
        return JSONResponse(
            status_code=503,
            content={
                "code": "REGISTRATION_DISABLED",
                "message": REGISTRATION_ERROR,
                "request_id": request.state.request_id,
                "retryable": False,
                "field_errors": [],
            },
        )

    return app
