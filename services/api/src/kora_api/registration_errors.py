"""Stable public messages. Never attach user input or driver exception strings."""

MESSAGES = {
    "REQUIRED_FIELDS_MISSING": (422, "!OJO! faltan datos obligatorios"),
    "CONSENT_REQUIRED": (422, "!OJO! Confirma tu consentimiento para crear la cuenta"),
    "CONTACT_INVALID": (422, "Este correo o número es inválido, prueba otro"),
    "PASSWORD_INVALID": (
        422,
        "La contraseña debe tener mínimo 12 caracteres e incluir una mayúscula, una minúscula, un número y un carácter especial",
    ),
    "DISPLAY_NAME_INVALID": (
        422,
        "Usa hasta 100 caracteres: letras, números y espacios",
    ),
    "BIRTH_DATE_INVALID": (422, "Ingresa una fecha de nacimiento válida"),
    "AGE_RESTRICTED": (422, "Debes tener al menos 18 años para crear una cuenta"),
    "VALIDATION_ERROR": (422, "Revisa los datos de la solicitud"),
    "CONTACT_NOT_AVAILABLE": (409, "Este correo o número no está disponible"),
    "CONSENT_VERSION_CHANGED": (
        409,
        "!OJO! Confirma tu consentimiento para crear la cuenta",
    ),
    "IDEMPOTENCY_CONFLICT": (
        409,
        "No se pudo confirmar el envío. Revisa tus datos e inténtalo de nuevo.",
    ),
    "REGISTRATION_IN_PROGRESS": (
        409,
        "Tu registro sigue en proceso. Inténtalo nuevamente.",
    ),
    "REQUEST_INVALID": (400, "Revisa los datos de la solicitud"),
    "BODY_TOO_LARGE": (413, "Revisa los datos de la solicitud"),
    "UNSUPPORTED_MEDIA_TYPE": (415, "Revisa los datos de la solicitud"),
    "RATE_LIMITED": (429, "Demasiados intentos. Inténtalo nuevamente más tarde."),
    "REGISTRATION_DISABLED": (
        503,
        "Hubo un error para registrate, intentalo nuevamente más tarde",
    ),
    "DATABASE_UNAVAILABLE": (
        503,
        "Hubo un error para registrate, intentalo nuevamente más tarde",
    ),
    "INTERNAL_ERROR": (
        500,
        "Hubo un error para registrate, intentalo nuevamente más tarde",
    ),
}


class RegistrationError(Exception):
    def __init__(self, code: str, fields: list[tuple[str, str]] | None = None):
        super().__init__(code)
        self.code = code
        self.fields = fields or []

    def body(self, request_id: str, incident_id: str | None = None):
        result = {
            "code": self.code,
            "message": MESSAGES[self.code][1],
            "request_id": request_id,
            "retryable": self.code
            in {
                "REGISTRATION_IN_PROGRESS",
                "RATE_LIMITED",
                "DATABASE_UNAVAILABLE",
                "INTERNAL_ERROR",
            },
            "field_errors": [
                {"field": field, "code": code, "message": MESSAGES[code][1]}
                for field, code in self.fields
            ],
        }
        if incident_id is not None:
            result["incident_id"] = incident_id
        return result
