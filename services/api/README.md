# API

Primera versión ejecutable del backend en FastAPI, construida para dar servicio al
portal `apps/admin-web` sobre PostgreSQL. Prototipo académico con datos sintéticos.

## Estado frente a los contratos del repositorio

Esta API **no implementa todavía los contratos acordados** y no debe tomarse como su
cumplimiento. Diferencias conocidas, pendientes de revisión entre Julian y John:

| Tema | Contrato o documento | Esta API |
| --- | --- | --- |
| Registro | `POST /api/v2/accounts`, sin sesión, cuenta `passenger`, idempotencia, contraseña de 12+ caracteres ([contrato v2](../../Documentación/CONTRATO_REGISTRO.md)) | No implementado. Hay rutas provisionales `/api/v1/mobile/auth/register/*` con otros campos, que emiten sesión |
| Rutas REST | [openapi.json](../../Documentación/Contratos/openapi.json) (diseño v1) | Rutas propias del portal, descritas en `apps/admin-web/docs/api-contract-requests.md` |
| Estados de viaje | `requested → accepted → ready → in_progress → completed` ([sincronización](../../Documentación/SINCRONIZACION.md)) | `requested → accepted → driver_arriving → in_progress → completed / cancelled` |
| Estados de alerta | `created → dispatched → delivered → acknowledged → resolved` | `open → acknowledged → resolved`, con entregas por canal aparte |
| Eventos | Persistidos, con `sequence` por viaje y recuperación REST | En memoria del proceso; reenvío solo de los últimos eventos |
| Idempotencia | Clave en escrituras sensibles | Solo en posiciones GPS (por `id` de la posición) |
| Persistencia | PostGIS, SQLAlchemy y Alembic | PostgreSQL sin PostGIS, SQL directo con psycopg y scripts en `db/` |
| Python | 3.12 | Desarrollado y probado con 3.11 |
| Biometría | Trabajador aislado | No existe. La verificación queda `pending` y ninguna conductora puede aprobarse |
| Notificaciones | Bandeja de salida y FCM | No existen. Las alertas solo llegan al portal por WebSocket |

Las rutas `/api/v1/mobile` existen para generar datos sintéticos y probar el portal de
punta a punta. **La app Flutter no debe integrarse contra ellas.**

## Puesta en marcha (Windows, PowerShell)

Requisitos: Python 3.11 o superior y PostgreSQL 13 o superior.

```powershell
cd services\api

# 1. Entorno y dependencias
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# 2. Configuración: copia .env.example como .env y completa DATABASE_URL y JWT_SECRET
Copy-Item .env.example .env

# 3. Crea las tablas (aplica db/*.sql) y cuatro usuarios administrativos de prueba
.\.venv\Scripts\python.exe -m app.cli init-db
.\.venv\Scripts\python.exe -m app.cli seed-pilot --password "una-clave-local"

# 4. Arranca el servidor
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

- Documentación interactiva de las rutas: `http://localhost:8000/docs`
- `seed-pilot` crea un usuario sintético por rol (`admin@piloto.test`, `operadora@piloto.test`,
  `verificadora@piloto.test`, `auditora@piloto.test`). La contraseña la eliges tú; no está en el código.
- Usuario individual: `python -m app.cli create-admin --name "Nombre" --email correo@dominio --role super_admin`

## Conectar el portal

Crea `apps/admin-web/.env.local` con:

```
VITE_USE_MOCKS=false
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws/admin
```

y reinicia `npm run dev`. El origen del portal debe estar en `CORS_ORIGINS`. Usa siempre
`localhost` en ambos (no mezcles con `127.0.0.1`): la cookie de sesión es `SameSite=Strict`.

## Estructura

| Ruta | Contenido |
| --- | --- |
| `app/main.py` | Arranque, CORS, WebSocket `/ws/admin` y revisión periódica de pérdida de señal |
| `app/routers/admin.py` | Rutas del portal: sesión, conductoras, viajes, alertas, parámetros, auditoría, privacidad |
| `app/routers/public.py` | Seguimiento público por token y descarga de archivos con URL firmada |
| `app/routers/mobile.py` | Rutas provisionales para generar datos (ver el aviso de arriba) |
| `app/security.py` | Contraseñas (scrypt), tokens de acceso, sesiones de renovación y permisos por rol |
| `app/monitoring.py` | Desviación de ruta, parada prolongada, pérdida de señal e índice de anomalía |
| `app/biometrics.py` | Punto de integración del motor biométrico |
| `app/cli.py` | Comandos `init-db`, `create-admin` y `seed-pilot` |
| `db/` | Scripts SQL del esquema, aplicados en orden por `init-db` |
| `tests/` | Pruebas de integración contra una base de pruebas |

## Pruebas

Escriben datos, así que usan una base aparte, nunca `DATABASE_URL`. El nombre de la base
debe contener `test`:

```powershell
$env:TEST_DATABASE_URL = "postgresql://postgres:TU_CLAVE@localhost:5432/kora_test"
.\.venv\Scripts\python.exe -m pytest
```

Cubren sesión y permisos del portal, revisión de conductoras, consulta justificada de datos
sensibles, monitoreo de un viaje, alertas, enlace público, parámetros y solicitudes de datos.
No cubren los casos REG01–REG11 del contrato de registro v2.

## Supuestos y límites

- **Verificación simulada:** es un doble de prueba; solo se activa con `APP_ENV=test`.
- **Índice de anomalía:** reglas sencillas con pesos y cortes supuestos. No es una
  probabilidad de delito.
- **Umbrales** 100 m / 30 s / 180 s: pendientes de confirmar; se leen de la tabla `parameters`.
- **Visibilidad de viajes:** toda persona con `trips:monitor` ve todos los viajes.
- **Plazos de solicitudes de datos:** 10 y 15 días hábiles, sin festivos.
- **Un solo proceso:** WebSocket y límite de peticiones en memoria; no usar varios workers.
- **Datos sensibles:** documento, teléfono y archivos se guardan sin cifrado de aplicación.
  No usar con datos reales.
