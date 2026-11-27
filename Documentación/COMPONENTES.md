# Componentes y ejecución

Android ya está inicializado; comandos y alcance en [MOVIL_APARIENCIA.md](MOVIL_APARIENCIA.md). Los demás componentes siguen pendientes. Registrar versiones, variables sin secretos, instalación, pruebas, construcción y diagnóstico al implementarlos.

## Android

Base Flutter Android inicializada en CAM-2026-007. Una aplicación con perfiles de pasajera y conductora. Arquitectura prevista: lib/core, lib/features/<funcion>/data y lib/features/<funcion>/presentation; añadir dominio solo cuando sea necesario.

Seguir Documentación/GUIA_CODEX.md y Documentación/SINCRONIZACION.md. Conservar pubspec.yaml, pubspec.lock y Flutter 3.50.1. Identificador de desarrollo actual dev.kora.kora_mobile; revisar antes de distribución y no confundirlo con el nombre visible Köra.

Existe código móvil de APP01 y APP02 con pruebas locales. APP02 añade pantallas de registro, solicitud, estado y apelaciones, sin servicio conectado; ver [PANTALLAS_REGISTRO.md](PANTALLAS_REGISTRO.md). El usuario reporta que la primera APK funciona en su Redmi con Android 16; checklist detallado y validación física de APP02 pendientes.

## Web

Pendiente de inicializar React con TypeScript y Vite. Consumir el mismo backend de la aplicación Android; trabajar desde contracts con datos sintéticos identificados mientras se construye la API.

Vistas previstas: sesión, revisión de conductoras, viajes, seguimiento y atención de alertas. Los permisos son del servidor, no de botones ocultos. Crear package.json y lock al generar el proyecto real.

## API

Pendiente de inicializar FastAPI con Python 3.12. Estructura sugerida: app/core, app/auth, app/trips, app/locations, app/verifications, app/alerts y app/events. Añadir pyproject.toml, lock y migraciones Alembic al implementar.

Fuente de diseño: Documentación/Contratos/openapi.json y Documentación/SINCRONIZACION.md. La API valida roles, propiedad, identidad, estados e idempotencia y persiste eventos. PostgreSQL/PostGIS es la fuente de verdad para ambos clientes. Ningún endpoint de contrato está implementado todavía.

## Biometría

Pendiente de prueba de viabilidad. Evaluar OpenCV con YuNet y SFace para comparación uno a uno, y una solución de detección de vida con licencia y evaluación independiente.

Ejecutar como trabajador aislado para que inferencia no bloquee rutas y alertas. Tomar trabajos persistidos y guardar resultados con modelo, umbral, estado y fecha. Un fallo o vencimiento conserva estado pendiente o fallido; nunca aprobar automáticamente. No descargar modelos ni añadir imágenes reales sin resolver finalidad y licencia.

## Infraestructura

Especificación, no despliegue creado. Ver Documentación/ARQUITECTURA.md. Desarrollo local con API, PostgreSQL/PostGIS y dos clientes; Render para integración y piloto, con API siempre activa, trabajador separado, base gestionada y web estática.

Se crearán Dockerfile, compose y configuración Render al disponer de aplicaciones y comandos de construcción comprobados. Elegir región y planes tras medir memoria y latencia; no introducir un blueprint que apunte a servicios inexistentes. Cada componente requiere health check, límites, secretos de entorno y plan de reversión.

Presupuestar en conjunto API, trabajador, DB, almacenamiento, egreso y respaldo. No multiplicar costos de una misma API por cada cliente. Los secretos del servidor no se distribuyen a Flutter o Vite.
