# Componentes y ejecución

Android ya está inicializado; comandos y alcance en [MOVIL_APARIENCIA.md](MOVIL_APARIENCIA.md). FastAPI base está inicializado en API01; [BASE_API.md](BASE_API.md) contiene instalación, configuración y límites. Web y funciones completas siguen pendientes.

## Android

Base Flutter Android inicializada en CAM-2026-007. Una aplicación con perfiles de pasajera y conductora. Arquitectura prevista: lib/core, lib/features/<funcion>/data y lib/features/<funcion>/presentation; añadir dominio solo cuando sea necesario.

Seguir Documentación/GUIA_CODEX.md y Documentación/SINCRONIZACION.md. Conservar pubspec.yaml, pubspec.lock y Flutter 3.50.1. Identificador de desarrollo actual dev.kora.kora_mobile; revisar antes de distribución y no confundirlo con el nombre visible Köra.

Existe código móvil de APP01 y APP02 con pruebas locales. APP02 añade pantallas de registro, solicitud, estado y apelaciones, sin servicio conectado; ver [PANTALLAS_REGISTRO.md](PANTALLAS_REGISTRO.md). El usuario reporta que la primera APK funciona en su Redmi con Android 16; checklist detallado y validación física de APP02 pendientes.

## Web

Pendiente de inicializar React con TypeScript y Vite. Consumir el mismo backend de la aplicación Android; trabajar desde contracts con datos sintéticos identificados mientras se construye la API.

Vistas previstas: sesión, revisión de conductoras, viajes, seguimiento y atención de alertas. Los permisos son del servidor, no de botones ocultos. Crear package.json y lock al generar el proyecto real.

## API

FastAPI base inicializado en services/api/src/kora_api, con Python 3.12.16, pyproject.toml, uv.lock y Alembic. Salud, preparación PostgreSQL/PostGIS, política y puerta de registro cerradas. Seis tablas compartidas, sin datos de ejemplo al arrancar. Revisar [BASE_API.md](BASE_API.md) antes de migrar o ejecutar pruebas; no apuntar la suite a Neon o a una base con datos reales.

Fuente de diseño de registro: Documentación/CONTRATO_REGISTRO.md y Contratos/registration-v2.openapi.json; v1 queda como antecedente. La validación de alta, sesiones, permisos por recurso, viajes y eventos sigue pendiente. PostgreSQL/PostGIS será fuente común para ambos clientes. Solo GET de política en modo cerrado y POST de rechazo están disponibles del registro; no hay cuentas funcionales.

## Biometría

Pendiente de prueba de viabilidad. Evaluar OpenCV con YuNet y SFace para comparación uno a uno, y una solución de detección de vida con licencia y evaluación independiente.

Ejecutar como trabajador aislado para que inferencia no bloquee rutas y alertas. Tomar trabajos persistidos y guardar resultados con modelo, umbral, estado y fecha. Un fallo o vencimiento conserva estado pendiente o fallido; nunca aprobar automáticamente. No descargar modelos ni añadir imágenes reales sin resolver finalidad y licencia.

## Infraestructura

Especificación, no despliegue creado. Ver Documentación/ARQUITECTURA.md. Desarrollo local con API, PostgreSQL/PostGIS y dos clientes; Render para integración y piloto, con API siempre activa, trabajador separado, base gestionada y web estática.

infra/compose.test.yml y api.yml de CI proporcionan PostgreSQL/PostGIS desechable de pruebas; no son despliegue del piloto. Dockerfile de API y configuración de alojamiento siguen pendientes. Elegir región y planes tras medir memoria y latencia; no introducir un blueprint que apunte a servicios inexistentes.

Presupuestar en conjunto API, trabajador, DB, almacenamiento, egreso y respaldo. No multiplicar costos de una misma API por cada cliente. Los secretos del servidor no se distribuyen a Flutter o Vite.
