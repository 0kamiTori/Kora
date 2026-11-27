"""Errores con el formato que espera el portal: { "code": "...", "message": "..." }."""
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def fail(status: int, code: str, message: str):
    raise ApiError(status, code, message)


def parse_uuid(value: str, not_found_message: str) -> uuid.UUID:
    """Un identificador con formato inválido se trata como recurso inexistente."""
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError, TypeError):
        raise ApiError(404, "not_found", not_found_message) from None


_DEFAULT_MESSAGES = {
    401: "Tu sesión expiró. Inicia sesión de nuevo.",
    403: "No tienes permiso para realizar esta acción.",
    404: "No se encontró el recurso solicitado.",
    405: "Método no permitido.",
}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, error: ApiError) -> JSONResponse:
        return JSONResponse({"code": error.code, "message": error.message}, error.status)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, error: RequestValidationError) -> JSONResponse:
        first = error.errors()[0] if error.errors() else {}
        field = ".".join(str(part) for part in first.get("loc", []) if part != "body")
        detail = f" Campo: {field}." if field else ""
        return JSONResponse(
            {"code": "validation_error", "message": f"Los datos enviados no son válidos.{detail}"},
            422,
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, error: StarletteHTTPException) -> JSONResponse:
        message = _DEFAULT_MESSAGES.get(error.status_code, str(error.detail))
        return JSONResponse(
            {"code": f"http_{error.status_code}", "message": message}, error.status_code
        )
