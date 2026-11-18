# Backend compartido

Pendiente de inicializar FastAPI con Python 3.12. Estructura sugerida: app/core, app/auth, app/trips, app/locations, app/verifications, app/alerts y app/events. Añadir pyproject.toml, lock y migraciones Alembic al implementar.

Fuente de diseño: contracts/openapi.json y docs/SINCRONIZACION.md. La API valida roles, propiedad, identidad, estados e idempotencia y persiste eventos. PostgreSQL/PostGIS es la fuente de verdad para ambos clientes. Ningún endpoint de contrato está implementado todavía.
