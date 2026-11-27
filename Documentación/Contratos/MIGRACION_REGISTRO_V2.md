# Migración del diseño de registro a v2

CAM-2026-010 · 26/11/2026. El contrato inicial openapi.json permanece como antecedente de diseño v1 sin cambios. Su AccountRegistration cerrado solo admitía email, password, requested_role y consent_version. Añadir campos obligatorios y un consentimiento explícito cambia la forma de la solicitud y necesita una versión nueva.

## Destino

El contrato acotado [registration-v2.openapi.json](registration-v2.openapi.json) usa /api/v2 para política y alta. El resto de operaciones del contrato inicial no se declara migrado ni implementado. Al iniciar cada historia, revisar su contrato antes de extender v2. No lanzar una API v1 incompleta para mantener una compatibilidad inexistente.

## Clientes

APP02 no hace solicitudes HTTP y la web no está inicializada, por lo que no hay consumidores funcionales desplegados ni datos de cuenta que migrar. La futura capa de datos móvil usará la URL configurada del backend compartido y mapeará los campos según [CONTRATO_REGISTRO.md](../CONTRATO_REGISTRO.md). No cambiar el formulario ni crear cuentas simuladas como parte de este cambio.

Los archivos .env.example de API, móvil y web aún contienen /api/v1 como referencia inicial no consumida. Al inicializar la API y conectar los clientes, actualizar sus URLs de registro a /api/v2 explícitamente, sin copiar credenciales de PostgreSQL a los clientes ni inventar endpoints v2 para las historias aún no revisadas. Los eventos de viaje siguen siendo diseño v1 pendiente.

Si posteriormente existe un cliente v1, inventariarlo antes de retirar o cambiar rutas; definir adaptación, pruebas y fecha de retirada mediante otra decisión. No aceptar silenciosamente cuerpos v1 como si incluyeran un consentimiento explícito inexistente.

## Datos y reversión

Una única tabla lógica de cuentas y UUID común, sin copias por cliente o versión. Crear el esquema mediante migraciones cuando exista backend; hoy no se ejecuta ninguna migración ni SQL. El rol driver nunca se obtiene por elegir requested_role=driver en el alta.

Para revertir ahora basta retirar el borrador v2 y sus referencias mediante un cambio documentado; no afecta datos porque no hay servicio implementado. Cuando haya datos reales, preservar IDs y recibos de consentimiento; no revertir migraciones destructivas ni borrar cuentas para cambiar de contrato. El hash del archivo v1 se conserva en x-legacy-contract y se comprueba en CI.

Texto de consentimiento y responsable pendientes. La publicación de este contrato no habilita el tratamiento de datos reales.
