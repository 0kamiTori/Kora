# Infraestructura y despliegue

Especificación, no despliegue creado. Ver docs/ARQUITECTURA.md. Desarrollo local con API, PostgreSQL/PostGIS y dos clientes; Render para integración y piloto, con API siempre activa, trabajador separado, base gestionada y web estática.

Se crearán Dockerfile, compose y configuración Render al disponer de aplicaciones y comandos de construcción comprobados. Elegir región y planes tras medir memoria y latencia; no introducir un blueprint que apunte a servicios inexistentes. Cada componente requiere health check, límites, secretos de entorno y plan de reversión.

Presupuestar en conjunto API, trabajador, DB, almacenamiento, egreso y respaldo. No multiplicar costos de una misma API por cada cliente. Los secretos del servidor no se distribuyen a Flutter o Vite.
