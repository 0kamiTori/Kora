# Migración del diseño de registro a v2

CAM-2026-010 · 26/11/2026. El contrato inicial openapi.json permanece como antecedente de diseño v1 sin cambios. Su AccountRegistration cerrado solo admitía email, password, requested_role y consent_version. Añadir campos obligatorios y un consentimiento explícito cambia la forma de la solicitud y necesita una versión nueva.

## Destino

El contrato acotado [registration-v2.openapi.json](registration-v2.openapi.json) usa /api/v2 para política y alta. El resto de operaciones del contrato inicial no se declara migrado ni implementado. Al iniciar cada historia, revisar su contrato antes de extender v2. No lanzar una API v1 incompleta para mantener una compatibilidad inexistente.

## Clientes

APP02 no hace solicitudes HTTP y la web no está inicializada, por lo que no hay consumidores funcionales desplegados ni datos de cuenta que migrar. La futura capa de datos móvil usará la URL configurada del backend compartido y mapeará los campos según [CONTRATO_REGISTRO.md](../CONTRATO_REGISTRO.md). No cambiar el formulario ni crear cuentas simuladas como parte de este cambio.

API01 ya usa /api/v2 en su política y puerta cerrada; elimina API_PREFIX del ejemplo para no sugerir rutas configurables inexistentes. Los ejemplos móviles y web conservan /api/v1 como antecedente no consumido y deben actualizarse explícitamente al conectar el registro. No copiar credenciales PostgreSQL a los clientes ni inventar endpoints v2 para historias no revisadas. Los eventos de viaje siguen siendo diseño pendiente.

Si posteriormente existe un cliente v1, inventariarlo antes de retirar o cambiar rutas; definir adaptación, pruebas y fecha de retirada mediante otra decisión. No aceptar silenciosamente cuerpos v1 como si incluyeran un consentimiento explícito inexistente.

## Datos y reversión

Una única tabla lógica de cuentas y UUID común, sin copias por cliente o versión. En CAM010 no se ejecutaba SQL; API01 añade la migración inicial y sus pruebas desechables, sin conectarse a Neon ni migrar datos reales. El rol driver nunca se obtiene por elegir requested_role=driver en el alta.

API01 ya contiene servicio base y migración; retirar el borrador no revierte su código o esquema automáticamente. La prueba de descenso se limita a la base desechable de CI, sin datos reales. Cuando haya datos persistentes, preservar IDs y recibos de consentimiento y definir reversión con respaldo; no borrar cuentas para cambiar de contrato. El hash del archivo v1 se conserva en x-legacy-contract y se comprueba en CI.

Julian se declara responsable; texto final y contactos pendientes. La publicación del contrato y de la base API no habilita el tratamiento de datos reales.
