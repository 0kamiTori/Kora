"""PUNTO DE INTEGRACIÓN — Motor biométrico (RF04, RF05).

Este servicio NO incluye comparación facial ni detección de vida. Este módulo es
el único lugar que hay que cambiar para conectar el trabajador biométrico:
`evaluate_enrollment` debe devolver el resultado de la verificación.

Sin motor, la verificación queda `pending` y la conductora no puede ser aprobada
ni aceptar viajes: nunca se aprueba automáticamente.

DOBLE DE PRUEBA: con APP_ENV=test y BIOMETRIC_MODE=simulated la verificación se
marca confirmada sin comparar nada, para poder probar el resto del flujo. Fuera
del entorno de pruebas ese modo se ignora (ver app/config.py). Queda identificado
en `model_version` y sin puntuación, para que no se confunda con un resultado real.
"""
from pathlib import Path
from typing import Any

from .config import settings

SIMULATED_MODEL = "simulado-sin-comparacion-facial"
PENDING_MODEL = "sin-motor-biometrico"


def model_version() -> str:
    return SIMULATED_MODEL if settings.biometric_mode == "simulated" else PENDING_MODEL


def evaluate_enrollment(photo_path: Path) -> dict[str, Any] | None:
    """Devuelve el resultado de la verificación o None si queda pendiente."""
    if settings.biometric_mode == "simulated":
        return {
            "status": "confirmed",
            "result": "match",
            "score": None,
            "liveness_status": "not_performed",
        }
    return None
