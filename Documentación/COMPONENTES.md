# Componentes y ejecución

No hay aplicaciones inicializadas ni comandos de construcción validados. Al crear cada componente, registrar aquí versiones, variables sin secretos, instalación, pruebas, construcción y diagnóstico.

## Android

Pendiente de inicializar con Flutter. Una aplicación con perfiles de pasajera y conductora. Arquitectura prevista: lib/core, lib/features/<funcion>/data y lib/features/<funcion>/presentation; añadir dominio solo cuando sea necesario.

Seguir Documentación/GUIA_CODEX.md y Documentación/SINCRONIZACION.md. Crear pubspec.yaml y pubspec.lock reales al inicializar. Seleccionar y fijar identificador Android de desarrollo antes de crear el proyecto; no usar el nombre provisional del repositorio como compromiso de identificador de tienda.

No hay código móvil, APK ni pruebas de dispositivo en esta etapa.

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
