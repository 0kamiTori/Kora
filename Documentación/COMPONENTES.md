# Componentes y ejecución

Android ya está inicializado; comandos y alcance en [MOVIL_APARIENCIA.md](MOVIL_APARIENCIA.md). Los demás componentes siguen pendientes. Registrar versiones, variables sin secretos, instalación, pruebas, construcción y diagnóstico al implementarlos.

## Android

Base Flutter Android inicializada en CAM-2026-007. Una aplicación con perfiles de pasajera y conductora. Arquitectura prevista: lib/core, lib/features/<funcion>/data y lib/features/<funcion>/presentation; añadir dominio solo cuando sea necesario.

Seguir Documentación/GUIA_CODEX.md y Documentación/SINCRONIZACION.md. Conservar pubspec.yaml, pubspec.lock y Flutter 3.50.1. Identificador de desarrollo actual dev.kora.kora_mobile; revisar antes de distribución y no confundirlo con el nombre visible Köra.

Existe código móvil de APP01 y APP02 con pruebas locales. APP02 añade pantallas de registro, solicitud, estado y apelaciones, sin servicio conectado; ver [PANTALLAS_REGISTRO.md](PANTALLAS_REGISTRO.md). El usuario reporta que la primera APK funciona en su Redmi con Android 16; checklist detallado y validación física de APP02 pendientes.

## Web

Inicializado en CAM-2026-011 en apps/admin-web: React 18, TypeScript estricto y Vite 5, con package.json y lock. Requiere Node 20.19 o superior. Comandos: npm install, npm run dev (puerto 5173), npm run typecheck, npm run lint, npm test y npm run test:e2e. Detalle en apps/admin-web/README.md.

Vistas: sesión, panel, revisión de conductoras, viajes, alertas, parámetros, auditoría, solicitudes de datos y seguimiento público. Usa datos sintéticos en memoria salvo que apps/admin-web/.env.local defina VITE_USE_MOCKS=false, VITE_API_BASE_URL y VITE_WS_URL. Los permisos son del servidor, no de botones ocultos. Sus tipos y rutas siguen su propia propuesta, apps/admin-web/docs/api-contract-requests.md, aún no conciliada con Documentación/Contratos.

## API

Primera versión ejecutable en services/api desde CAM-2026-011: FastAPI con psycopg 3 y scripts SQL en services/api/db, probada con Python 3.11. Variables en services/api/.env.example. Comandos: python -m app.cli init-db, python -m uvicorn app.main:app --port 8000 y python -m pytest con TEST_DATABASE_URL. Detalle y tabla de diferencias en services/api/README.md.

Fuente de diseño: Documentación/Contratos/openapi.json y Documentación/SINCRONIZACION.md. La API debe validar roles, propiedad, identidad, estados e idempotencia y persistir eventos, con PostgreSQL/PostGIS como fuente de verdad. La versión actual sirve al portal y no implementa esos contratos: ningún endpoint de contrato está implementado todavía. Siguen pendientes Python 3.12, la estructura sugerida por dominios, pyproject.toml con lock, Alembic, PostGIS, eventos persistidos e idempotencia general.

## Biometría

Pendiente de prueba de viabilidad. Evaluar OpenCV con YuNet y SFace para comparación uno a uno, y una solución de detección de vida con licencia y evaluación independiente.

Ejecutar como trabajador aislado para que inferencia no bloquee rutas y alertas. Tomar trabajos persistidos y guardar resultados con modelo, umbral, estado y fecha. Un fallo o vencimiento conserva estado pendiente o fallido; nunca aprobar automáticamente. No descargar modelos ni añadir imágenes reales sin resolver finalidad y licencia.

## Infraestructura

Especificación, no despliegue creado. Ver Documentación/ARQUITECTURA.md. Desarrollo local con API, PostgreSQL/PostGIS y dos clientes; Render para integración y piloto, con API siempre activa, trabajador separado, base gestionada y web estática.

Se crearán Dockerfile, compose y configuración Render al disponer de aplicaciones y comandos de construcción comprobados. Elegir región y planes tras medir memoria y latencia; no introducir un blueprint que apunte a servicios inexistentes. Cada componente requiere health check, límites, secretos de entorno y plan de reversión.

Presupuestar en conjunto API, trabajador, DB, almacenamiento, egreso y respaldo. No multiplicar costos de una misma API por cada cliente. Los secretos del servidor no se distribuyen a Flutter o Vite.
