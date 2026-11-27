# Base de desarrollo en Neon

27/11/2026 · DB01 · CAM-2026-012. Implementación asistida para Julian; revisión de John pendiente.

La base `kora_dev` está creada y migrada en Neon. La API local puede consultarla con una credencial de ejecución separada de la propietaria. Este paso prepara la persistencia compartida de Android y web; no implementa el registro ni despliega la API. La evidencia saneada está en [DB01_EVIDENCIA_NEON.json](DB01_EVIDENCIA_NEON.json).

## Configuración realizada

- Se inspeccionó `neondb` mediante consultas de lectura: cero tablas de usuario y sin PostGIS. No se aplicaron migraciones en esa base.
- Se creó `kora_dev` como base separada en la misma rama de Neon. No es otra rama, proyecto o aislamiento de recursos de cómputo; los roles pertenecen a la rama. No se contrató un plan nuevo ni se verificaron cuotas, retención o restauración.
- Se aplicó Alembic hasta `0001_api_base`: extensión PostGIS, esquema `kora`, seis tablas, restricciones y triggers. Todas las tablas permanecen vacías; no se insertaron personas, cuentas administrativas o consentimiento aprobado.
- Se verificaron PostgreSQL 18.7 y PostGIS 3.6.4 disponibles en este Neon. CI conserva PostgreSQL 16/PostGIS 3.7: la comprobación de migración y salud en Neon no equivale a ejecutar toda la suite en PostgreSQL 18. No se ejecutó el descenso de migración ni la suite destructiva en Neon.

## Credenciales y permisos

`services/api/.env`, excluido de Git, contiene dos conexiones a `kora_dev`:

| Variable | Conexión y permisos |
|---|---|
| DATABASE_URL | Pooler con rol nuevo `kora_app_dev` y contraseña aleatoria generada localmente. Uso de esquema y SELECT/INSERT/UPDATE/DELETE sobre tablas de aplicación, excepto el catálogo `consent_versions`, de solo lectura. Lectura de revisión Alembic. |
| MIGRATION_DATABASE_URL | Conexión directa con el propietario existente. Solo para el operador de migraciones; no distribuir a los clientes. |

El rol de ejecución no tiene superusuario, creación de bases o roles, bypass de RLS ni CREATE sobre `kora`; tampoco modifica la revisión Alembic o el catálogo de consentimiento. Se revocaron CONNECT y TEMPORARY de PUBLIC únicamente en la base nueva y se concedió CONNECT explícito al rol de ejecución. Esto no implementa autorización de usuarias: la API todavía debe comprobar roles y propiedad en cada operación. Las futuras migraciones deben conceder explícitamente los permisos necesarios sobre nuevas tablas; no se añadieron concesiones automáticas.

Las dos conexiones negociaron TLS desde el cliente. El estado SSL del backend interno tras el pooler no se usa como prueba del cifrado entre este equipo y Neon.

**Pendiente:** Julian debe regenerar en Neon la contraseña propietaria que quedó expuesta y sustituirla localmente en `MIGRATION_DATABASE_URL`. El rol nuevo de ejecución ya tiene una contraseña distinta que no se mostró ni publicó. No pegar las nuevas credenciales en el chat; no incluir `.env` en commits, ZIP, capturas o Word. La rotación del propietario puede afectar otros consumidores de ese rol y requiere coordinarlos.

## Evidencia observada

- `python -m kora_api.migrate upgrade`: terminó correctamente.
- `python -m kora_api.migrate current`: `0001_api_base (head)`.
- `python -m kora_api.migrate check`: sin operaciones nuevas detectadas.
- Comprobaciones HTTP en proceso con TestClient, usando configuración local y conexión real a Neon: `/health/live` 200, `/health/ready` 200, política 200 con registro deshabilitado y consentimiento nulo, POST de cuentas 503.
- Consultas de solo lectura verificaron seis tablas vacías, TLS cliente y ausencia de los privilegios elevados comprobados.

Las peticiones HTTP no probaron acceso desde el teléfono, despliegue HTTPS o red pública. No se afirma alta funcional, prueba integral del producto o cierre de F2. Las 28 pruebas previas siguen siendo evidencia separada de CI sobre PostgreSQL 16.

## Operación desde este equipo

Desde `services/api`, con el `.env` local configurado:

```powershell
rtk proxy uv run --frozen python -m kora_api.migrate current
rtk proxy uv run --frozen python -m kora_api.migrate check
rtk proxy uv run --frozen uvicorn kora_api.main:create_app --factory --host 127.0.0.1 --port 8000 --no-access-log
```

No ejecutar pruebas que eliminen tablas, downgrade o limpieza contra Neon. Una reversión con datos requiere respaldo y plan específico. Antes de utilizar datos reales siguen pendientes consentimiento definitivo, contactos, recuperación, permisos revisados y operación de incidentes. Antes del piloto separar su entorno y secretos de desarrollo.

El siguiente trabajo es implementar el alta transaccional y sus casos REG01–REG11 con datos sintéticos. Android y web consumirán la misma API; nunca recibirán la conexión PostgreSQL.

## Referencias oficiales

- [Conexiones pooler y directas](https://neon.com/docs/connect/connection-pooling): directa para migraciones y operaciones dependientes de sesión.
- [Gestión de bases](https://neon.com/docs/manage/databases): creación de bases mediante SQL y ámbito de propiedad.
- [Roles y contraseñas](https://neon.com/docs/manage/roles): gestión del acceso y rotación.

Los Word 01/02/03 reciben candidatos locales CAM012; sus versiones publicadas se conservan hasta completar render e inspección visual. El límite de render previamente documentado sigue pendiente; no atribuir sincronización completa.

## Verificación tras actualización de credencial

27/11/2026 · Seguimiento DB01/CAM-2026-012. Julian informa actualización de la contraseña propietaria en el .env local. Se verificó conexión directa a kora_dev con neondb_owner, TLS cliente y revisión 0001_api_base; la credencial separada de ejecución sigue preparada. No se consultó con la contraseña anterior, por lo que su revocación no se presenta como prueba independiente. Sustituye el pendiente de actualización local de contraseña indicado anteriormente. Registro y datos reales siguen deshabilitados; revisión de John y Word pendientes.
