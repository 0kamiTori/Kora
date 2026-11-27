"""Configuración de las pruebas.

Las pruebas escriben datos, así que NUNCA usan DATABASE_URL: exigen una base
aparte en TEST_DATABASE_URL cuyo nombre contenga "test". Ejemplo (PowerShell):

  $env:TEST_DATABASE_URL = "postgresql://postgres:CLAVE@localhost:5432/kora_test"
  python -m pytest

Todos los datos son sintéticos. La verificación de identidad simulada es un
doble de prueba que solo se activa aquí (APP_ENV=test).
"""
import os
import tempfile

import pytest

# Contraseña de los usuarios administrativos sintéticos; solo existe en la base de pruebas.
TEST_ADMIN_PASSWORD = "Solo-para-pruebas-automatizadas"

_url = os.environ.get("TEST_DATABASE_URL", "")
if _url:
    if "test" not in _url.rsplit("/", 1)[-1].lower():
        raise RuntimeError('El nombre de la base en TEST_DATABASE_URL debe contener "test".')
    # Se fija antes de importar la app para que no se lea el .env real.
    os.environ["DATABASE_URL"] = _url
    os.environ["APP_ENV"] = "test"
    os.environ["JWT_SECRET"] = "secreto-solo-para-pruebas-automatizadas-0123456789"
    os.environ["BIOMETRIC_MODE"] = "simulated"
    os.environ["STORAGE_DIR"] = tempfile.mkdtemp(prefix="kora-test-")
    os.environ["SQL_DIR"] = "./db"


@pytest.fixture(scope="session")
def client():
    if not _url:
        pytest.skip("Define TEST_DATABASE_URL para ejecutar las pruebas de integración.")
    from fastapi.testclient import TestClient

    from app import cli
    from app.main import app

    cli.init_db()
    cli.seed_pilot(TEST_ADMIN_PASSWORD)
    with TestClient(app) as test_client:
        yield test_client
