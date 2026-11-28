# Base compartida de API y persistencia

Historia API01 · CAM-2026-011 · 27/11/2026. Implementación asistida por Codex para Julian; revisión cruzada de John pendiente, sin atribuir aprobación académica. No se cierra F2 ni RF01 completo.

Se inicializa FastAPI en services/api con seis tablas de identidad y consentimiento en PostgreSQL y migración Alembic. El criterio de esta historia es que la API responda, distinga conexión preparada de proceso activo, permita migrar una base de pruebas y mantenga cerrado el registro. La APK y la web compartirán esta persistencia cuando se conecten; no se crea otra identidad en los clientes.

## Funciones disponibles y límites

| Ruta | Comportamiento |
|---|---|
| GET /health/live | 200 si responde el proceso; no afirma conexión a base. |
| GET /health/ready | 200 solo con conexión, revisión 0001_api_base, tablas requeridas y extensión PostGIS 3 o superior; 503 genérico si falta alguno. No muestra URL, SQL o excepción. |
| GET /api/v2/registration-policy | Política real de este servicio con registration_enabled=false, consent=null y fecha del servidor en Colombia. |
| POST /api/v2/accounts | 503 REGISTRATION_DISABLED, sin interpretar credenciales, crear cuentas o consumir datos sintéticos. No existe bandera de entorno para abrirlo en API01. |

Las cabeceras X-Request-ID y Cache-Control no-store se emiten sin valores personales. Excepciones inesperadas producen una respuesta saneada y un registro con identificadores y tipo de error, sin cuerpo o mensaje de excepción. No hay notificación a administración implementada; es requisito pendiente del alta funcional. Los hosts y orígenes de desarrollo son explícitos; no se habilitan cookies entre orígenes.

El OpenAPI automático de /docs es solo el de las rutas implementadas y se ofrece en local/test. No reemplaza el [contrato objetivo v2](Contratos/registration-v2.openapi.json), que sigue parcial en su implementación. No hay sesiones, registro con escritura, aprobación de conductoras, documentos, apelaciones o espera de 30 días ejecutables. Se mantienen esas reglas para historias posteriores.

## Tablas iniciales

| Tabla en esquema kora | Función |
|---|---|
| accounts | UUID, correo canónico único, teléfono E.164 único, nombre no único, nacimiento e intención de perfil. |
| account_credentials | Referencia única a cuenta y campo para hash Argon2id; la comprobación de prefijo no sustituye la generación y verificación criptográfica, aún pendientes. |
| account_roles | Roles por cuenta, sin crear ninguno automáticamente al migrar. Seleccionar intención de conductora no inserta un rol. |
| consent_versions | Texto, huella SHA256, estado y fecha de aprobación. Un texto aprobado no puede reescribirse bajo la misma versión. |
| account_consents | Recibos de aceptación positiva vinculados a cuenta y versión aprobada, sin reescritura. |
| registration_receipts | Clave única, huella de solicitud y respuesta mínima para idempotencia futura; no almacena formulario o contraseña, y no permite reescribir el recibo. |

La migración usa public.kora_alembic_version para su revisión y no crea usuarios, políticas aprobadas o cuentas de administración. Los contactos tienen restricciones únicas incluso bajo concurrencia. Edad, numeración completa, roles efectivos, hash criptográfico y transacción de alta requieren la siguiente historia; no se dan por implementados por tener columnas. Las defensas JSONB son estructurales; el futuro servicio también debe serializar estrictamente la respuesta permitida.

## Versiones y ejecución local

Python 3.12.16, uv 0.13.9, FastAPI 0.165.0, Uvicorn 0.54.0, SQLAlchemy 2.1.9, Alembic 1.20.1, Psycopg 3.3.9, Pydantic 2.14.4, pydantic-settings 2.16.3 y tzdata 2026.6. Dependencias directas fijadas y transitivas en uv.lock; herramientas de prueba en el mismo lock. El entorno services/api/.venv está aislado y excluido de Git, creado con Python administrado por uv; no usa el Python de documentos como entorno de backend.

Desde services/api:

```powershell
uv sync --frozen
uv run --frozen uvicorn kora_api.main:create_app --factory --host 127.0.0.1 --port 8000 --no-access-log
```

Sin .env, /health/live y la política cerrada funcionan; /health/ready responde 503 hasta configurar una base migrada. Crear services/api/.env a partir del ejemplo y completar los valores localmente. No copiar credenciales al chat, a la APK o al código web.

DATABASE_URL es la conexión del servicio; MIGRATION_DATABASE_URL es la del operador de migraciones. Se aceptan postgresql:// y postgresql+psycopg://, conservando sslmode y channel_binding. Fuera del entorno local se exige TLS; pilot exige TLS incluso con host local. No confundir una URL de PostgreSQL con la URL HTTP de la API. Las claves antiguas de ejemplo para JWT, mapas y biometría no se consumen en esta base.

## Base de pruebas opcional con Docker

Este equipo no tiene Docker o PostgreSQL local. No se instalaron ni se alteró Neon. Las pruebas de persistencia se ejecutarán en CI con un contenedor desechable; no necesitas crear una base en Neon para esta verificación.

Para usar Docker cuando esté disponible, desde la raíz:

```powershell
docker compose -f infra/compose.test.yml up -d db
```

El servicio usa PostgreSQL 16 y PostGIS 3.7 con digest de imagen fijado, puerto 55432 solo en 127.0.0.1 y base kora_test_api01. Las credenciales del archivo son sintéticas y exclusivas del entorno desechable; no reutilizarlas para datos reales. No se montan volúmenes de bases existentes. No hay ruta para actualizar una base de producción con ese contenedor.

La imagen estable 16-3.7 se selecciona porque el proveedor dejó de actualizar 16-3.5/16-3.6. Es una base nueva de pruebas; no se actualiza silenciosamente un volumen antiguo o el PostGIS de Neon. [Fuente del proyecto Docker PostGIS](https://github.com/postgis/docker-postgis).

## Migraciones y preparación para Neon

Desde services/api, una vez configurada la URL de una base de pruebas vacía:

```powershell
uv run --frozen python -m kora_api.migrate upgrade --sql
uv run --frozen python -m kora_api.migrate upgrade
uv run --frozen python -m kora_api.migrate current
uv run --frozen python -m kora_api.migrate check
```

--sql solo genera SQL para revisar, sin conectar. upgrade crea PostGIS si falta, esquema kora, tablas, restricciones y funciones de protección. check contrasta metadatos de tablas; los triggers y reglas se comprueban mediante pruebas específicas. No ejecutar migraciones en una base existente sin revisión, respaldo y entorno confirmado. La aplicación no ejecuta DDL al arrancar.

El CLI saneado no imprime la URL ni el mensaje bruto del driver si falla. Para Neon se necesitarán una rama o base exclusiva de desarrollo, la contraseña regenerada tras la exposición anterior y una conexión directa del operador con permisos para extensión/esquema. La cuenta de ejecución deberá tener permisos mínimos sobre el esquema y lectura de revisión; no distribuir el rol propietario a los clientes. No se ha probado conexión Neon ni se ha ejecutado SQL sobre esa cuenta.

No se publica un comando de downgrade en el CLI de uso normal. El descenso y ascenso de migración se prueba solo en una base desechable con guardas. No se elimina PostGIS ni se usa DROP SCHEMA CASCADE. La reversión de datos reales requiere un plan específico, no ejecutar el descenso de prueba.

## Verificación

```powershell
uv run --frozen ruff check .
uv run --frozen ruff format --check .
uv run --frozen pytest -ra
```

Localmente se aprobaron 13 pruebas sin base y se omitieron 15 PostgreSQL por falta de servidor. La ejecución CI 46066007419 aprobó después las 28 sin omisiones sobre PostgreSQL/PostGIS real. No se sustituyen las pruebas PostgreSQL por SQLite. La evidencia no incluye todavía conexión Neon o alta funcional.

Para ejecutar integración local, APP_ENV=test y KORA_TEST_DATABASE_URL deben señalar exclusivamente a una base kora_test_* en localhost. La suite rechaza otros hosts/nombres; realiza un ciclo upgrade/check/downgrade/upgrade en esa base desechable y usa transacciones de prueba. No debe apuntarse a Neon o al piloto. Todos los datos y aprobaciones de prueba se crean únicamente en tests, sin llamadas o notificaciones externas.

CI está definido en .github/workflows/api.yml con imagen PostGIS fijada, uv y lock. Verifica formato, análisis, migraciones de ida/vuelta, ausencia de deriva, disponibilidad, contactos únicos concurrentes, integridad, consentimiento aprobado e inmutable y sanitización de errores. Resultado remoto aprobado, con procedencia al final de esta guía.

## Siguiente historia

Implementar el alta transaccional según contrato y ejecutar REG01–REG11: normalización completa, edad, hash de contraseña, consentimiento vigente, reintentos e incidentes. Después conectar la APK y la web. Mantener registro real cerrado hasta completar el consentimiento y la operación correspondiente; no se modifica el diseño premium en esta historia. PERF01 y revisión visual de Word siguen pendientes.

## Evidencia PostgreSQL confirmada

La [ejecución 46066007419](https://github.com/0kamiTori/Kora/actions/runs/46066007419) del commit 54dcb4fca50f98ead7bd8cda3ed90e5a823dba46 terminó correctamente. El job postgres aprobó sincronización del lock, análisis, formato y **28 pruebas sin omisiones**, incluidas las 15 de PostgreSQL/PostGIS real. La suite ejecutó el ciclo de migración y comprobación de deriva, salud preparada, concurrencia de contactos y protección de consentimiento/recibos. La [comprobación documental 46066007221](https://github.com/0kamiTori/Kora/actions/runs/46066007221) también aprobó.

[Procedencia de la evidencia](API01_EVIDENCIA_CI.json). Esto verifica API01 sobre una base efímera de CI, no una conexión a Neon ni el alta funcional REG01–REG11. Las menciones anteriores a CI pendiente describen la preparación previa a este resultado. La revisión humana, consentimiento y Word siguen pendientes; no se cierra F2.

## Conexión Neon preparada en DB01

27/11/2026 · DB01 · CAM-2026-012. Base separada kora_dev creada en la misma rama Neon, sin alterar tablas de neondb. PostgreSQL 18.7/PostGIS 3.6.4, revisión 0001_api_base, seis tablas vacías y comprobación Alembic sin deriva. Conexiones locales separadas: pooler con rol de ejecución nuevo y directo con propietario para migraciones. TLS cliente verificado; credenciales solo en .env ignorado. /health/ready responde 200 desde comprobación HTTP en proceso; registro sigue deshabilitado y POST devuelve 503. No se ejecutó la suite destructiva contra Neon ni se desplegó API o conectó la APK. La suite completa anterior sigue limitada a PostgreSQL 16 de CI. Rotación de contraseña propietaria, revisión de John, consentimiento/contactos y revisión visual Word pendientes. Guía en NEON_DESARROLLO.md y evidencia saneada en DB01_EVIDENCIA_NEON.json. No se cierra fase ni se cambian presupuesto, fechas o capacidad.

Esta actualización sustituye las menciones anteriores a ausencia de conexión Neon, que describen API01 antes de esta preparación.

## Alta de pruebas API02

27/11/2026 · API02 · CAM-2026-013. Alta transaccional v2 implementada para pruebas sintéticas en PostgreSQL local kora_test_*, con validaciones, Argon2id, rol pasajera, consentimiento aprobado de prueba, contactos únicos y reintento HMAC/UUID. Respuesta 201 solo después de confirmar la transacción; clave en curso/conflictiva/vencida controlada y reproducción antes de política nueva. Sin cambio de esquema o datos Neon; aplicación y entornos no sintéticos mantienen registro cerrado. 51 pruebas locales aprobadas y 32 PostgreSQL previstas (31 omitidas en ejecución local anterior; un caso de bloqueo añadido después); CI pendiente. Incidentes saneados en bandeja local independiente de base, aviso real pendiente de canal. No hay sesiones, APK conectada, aprobación funcional o cierre de RF01/F2. Implementación asistida para Julian; revisión de John pendiente. Guía REGISTRO_BACKEND.md. Word candidatos locales pendientes de render; PERF01, consentimiento/contactos y entrega administrativa siguen pendientes.

## Evidencia de API02 confirmada

La [ejecución 46085546369](https://github.com/0kamiTori/Kora/actions/runs/46085546369), commit 3144c0cf42850ab6b0951cb87b734103e4d13398, aprobó sincronización del lock, Ruff y **83 pruebas sin omisiones**: 51 sin PostgreSQL y 32 de PostgreSQL/PostGIS. De estas últimas, 17 verifican el alta, incluyendo REG01–REG11 y los doce escenarios SYN. Foundation 46085546378 también aprobó. [Evidencia](API02_EVIDENCIA_CI.json).

Comprobación posterior con la configuración local de Neon: seis tablas conservadas, cero cuentas, preparación 200, política cerrada y POST 503; no se escribieron datos de prueba. La evidencia funcional de alta corresponde al contenedor de CI, no a un registro habilitado en Neon o a una APK conectada. No hay envío administrativo real: la bandeja sigue pendiente de canal. Revisión de John, consentimiento/contactos y Word pendientes. Los Word CAM013 se prepararon localmente, pero el renderizador confirmó que falta LibreOffice; se conservan los vigentes sin publicar candidatos. No se cierra fase.
