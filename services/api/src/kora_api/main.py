import json
from contextlib import asynccontextmanager
from uuid import UUID, uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import InterfaceError, OperationalError, TimeoutError
from starlette.concurrency import run_in_threadpool
from starlette.middleware.trustedhost import TrustedHostMiddleware

from kora_api.config import Settings
from kora_api.database import Database, DatabaseConfigurationError
from kora_api.incidents import IncidentReporter
from kora_api.registration import RegistrationService
from kora_api.registration_errors import MESSAGES, RegistrationError

REGISTRATION_ERROR = "Hubo un error para registrate, intentalo nuevamente más tarde"


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    database = Database(settings)
    registration = RegistrationService(settings, database)
    incidents = IncidentReporter(settings.incident_directory)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        database.dispose()

    app = FastAPI(
        title="Köra API",
        version="0.2.0",
        description="Alta transaccional disponible solo en pruebas sintéticas aisladas; registro público cerrado, sin sesiones.",
        docs_url="/docs" if settings.app_env in {"local", "test"} else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.app_env in {"local", "test"} else None,
        lifespan=lifespan,
    )
    app.state.database = database
    app.state.registration = registration
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
            incident_id = incidents.record(
                "INTERNAL_ERROR", request.state.request_id, error
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
    def registration_policy(request: Request):
        try:
            return registration.policy()
        except (
            OperationalError,
            InterfaceError,
            TimeoutError,
            DatabaseConfigurationError,
        ) as error:
            return incident_response(request, "DATABASE_UNAVAILABLE", error)

    def error_response(request: Request, error: RegistrationError, incident_id=None):
        headers = (
            {"Retry-After": "60"}
            if error.code == "RATE_LIMITED"
            else (
                {"Retry-After": "2"}
                if error.code in {"DATABASE_UNAVAILABLE", "REGISTRATION_IN_PROGRESS"}
                else {}
            )
        )
        return JSONResponse(
            status_code=MESSAGES[error.code][0],
            content=error.body(request.state.request_id, incident_id),
            headers=headers,
        )

    def incident_response(request: Request, code: str, error: Exception):
        incident_id = incidents.record(code, request.state.request_id, error)
        return error_response(request, RegistrationError(code), incident_id)

    @app.post("/api/v2/accounts", operation_id="registerAccountV2", status_code=201)
    async def register_account(request: Request):
        try:
            if not registration.enabled_for_tests:
                raise RegistrationError("REGISTRATION_DISABLED")
            peer = request.client.host if request.client else "unknown"
            if not registration.limiter.allow(registration.peer_key(peer)):
                raise RegistrationError("RATE_LIMITED")
            media = request.headers.get("content-type", "").lower().replace(" ", "")
            if (
                media not in {"application/json", "application/json;charset=utf-8"}
                or request.headers.get("content-encoding", "identity").lower()
                != "identity"
            ):
                raise RegistrationError("UNSUPPORTED_MEDIA_TYPE")
            length = request.headers.get("content-length")
            if length is not None:
                if not length.isascii() or not length.isdigit():
                    raise RegistrationError("REQUEST_INVALID")
                if len(length) > 5 or int(length) > 16384:
                    raise RegistrationError("BODY_TOO_LARGE")
            chunks, size = [], 0
            async for chunk in request.stream():
                size += len(chunk)
                if size > 16384:
                    raise RegistrationError("BODY_TOO_LARGE")
                chunks.append(chunk)

            def unique_object(pairs):
                result = {}
                for key, value in pairs:
                    if key in result:
                        raise ValueError
                    result[key] = value
                return result

            def invalid_constant(value):
                raise ValueError

            try:
                raw = b"".join(chunks).decode("utf-8")
                body = json.loads(
                    raw,
                    object_pairs_hook=unique_object,
                    parse_constant=invalid_constant,
                )
                # Reject lone surrogate escapes without ever logging their input.
                json.dumps(body, ensure_ascii=False).encode("utf-8")
                key = UUID(request.headers.get("Idempotency-Key", ""))
            except (ValueError, UnicodeError, RecursionError):
                raise RegistrationError("REQUEST_INVALID") from None
            response, replayed = await run_in_threadpool(
                registration.register, body, key
            )
            return JSONResponse(
                status_code=201,
                content=response,
                headers={"Idempotency-Replayed": str(replayed).lower()},
            )
        except RegistrationError as error:
            return error_response(request, error)
        except (
            OperationalError,
            InterfaceError,
            TimeoutError,
            DatabaseConfigurationError,
        ) as error:
            return incident_response(request, "DATABASE_UNAVAILABLE", error)

    return app
