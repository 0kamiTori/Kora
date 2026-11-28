# Registro transaccional del backend

27/11/2026 · API02 · CAM-2026-013. Implementación asistida para Julian Hernando Perez Villamizar; John Ortiz como revisor, revisión pendiente. Esta historia implementa el alta del contrato v2 para pruebas sintéticas aisladas. No incluye sesiones, APK conectada o aprobación de conductoras, ni cierra RF01 o F2.

## Comportamiento implementado

El servicio valida nuevamente campos obligatorios, contraseña, nombre, edad mínima y numeración internacional. Correo en minúsculas y sin espacios exteriores; nombre NFC con espacios exteriores eliminados y nombre repetible. Las contraseñas no se recortan ni normalizan. La fecha se calcula en Colombia desde el reloj del servidor; el cumpleaños del 29 de febrero corresponde al 1 de marzo en años no bisiestos según el criterio técnico ya propuesto.

El guardado de cuenta, credencial Argon2id, rol pasajera, aceptación versionada y recibo de idempotencia comparte una transacción. Un fallo revierte todos esos registros. Elegir driver solo conserva intención; no otorga ese rol, aprobación o sesión. Las restricciones PostgreSQL de correo y teléfono resuelven contactos duplicados incluso con solicitudes simultáneas.

Un bloqueo transaccional por UUID serializa la misma Idempotency-Key entre conexiones. Si otro envío posee el bloqueo, se devuelve REGISTRATION_IN_PROGRESS con Retry-After. Una huella HMAC-SHA256 considera campos normalizados y contraseña exacta, con secreto separado de la base. Mismo cuerpo y clave reproducen el mismo 201 durante 24 h. Diferente contenido o recibo vencido devuelven conflicto; no se elimina el recibo para reutilizar automáticamente la clave. Un éxito ya persistido se reproduce antes de exigir el nuevo consentimiento vigente.

No hay migración nueva: se utilizan las seis tablas de API01, sin modificar el esquema de Neon. El contrato v2 y el diseño v1 permanecen sin cambios incompatibles.

## Activación limitada a pruebas

El modo normal continúa cerrado y no interpreta el formulario. No existe un modo de registro público en esta versión. REGISTRATION_ENABLED no tiene efecto.

Para que el flujo sintético sea elegible deben cumplirse todas estas condiciones: APP_ENV=test, REGISTRATION_MODE=synthetic_test, conexión PostgreSQL a localhost/127.0.0.1 con base kora_test_*, versión configurada test-* y secreto HMAC independiente de al menos 32 bytes. Además, la base debe contener esa versión aprobada y no futura; las pruebas la insertan exclusivamente en su entorno desechable. Se admiten solo correos .invalid. No se comprueba titularidad telefónica ni se envían SMS o correos.

Las credenciales, la bandera de modo y los textos de prueba no se instalaron en Neon. La aplicación distribuida no contiene políticas aprobadas ficticias. Habilitar el registro real necesitará una historia revisada que complete consentimiento, contactos, incidentes y operación; cambiar solo una variable no lo habilita.

## Protección de entradas y contraseñas

- Cuerpo JSON UTF-8 de hasta 16 KiB, limitado durante lectura aunque no exista Content-Length. JSON mal formado, claves duplicadas, constantes no JSON y escapes Unicode inválidos se rechazan sin devolver sus valores.
- Se rechazan campos inesperados, roles administrativos y tipos incorrectos. Los mensajes literales de RF01 se mantienen y se añaden errores por campo sin repetir datos personales.
- Argon2id con perfil RFC_9106_LOW_MEMORY: 64 MiB, tres iteraciones, paralelismo cuatro, sal aleatoria de 16 bytes y hash de 32 bytes. Concurrencia de hashing limitada a dos por proceso; es configuración técnica por medir antes de despliegue, no objetivo de rendimiento cumplido.
- Biblioteca phonenumbers 9.0.44 para validar combinación de código y número, producir E.164 y evitar duplicados por presentación. email-validator 2.4.0 valida sintaxis sin consultas DNS; .invalid usa validación sintáctica equivalente con .test únicamente en el flujo aislado. argon2-cffi 25.1.0 fijado junto a uv.lock.
- Protección inicial de diez intentos por origen y minuto, límite de 4096 orígenes y reloj monotónico. Solo por proceso: no sustituye limitación distribuida o de infraestructura antes del piloto. No se confía en X-Forwarded-For enviado por el cliente. La clave de origen es HMAC y no se registra la IP.

## Incidentes y aviso administrativo

DATABASE_UNAVAILABLE e INTERNAL_ERROR producen un identificador de incidente y request_id, respuesta genérica y diagnóstico estructurado sin formulario, contraseña, contacto, URL o texto bruto de excepción. Se intenta conservar una línea JSON con fsync en INCIDENT_DIRECTORY/registration.jsonl, por defecto services/api/.local/incidents. Esta carpeta queda excluida de Git y no depende de PostgreSQL.

Cada registro lleva delivery_status=pending_channel: existe una bandeja local para el aviso, pero no envío o acuse administrativo. Si falla el disco se emite además incident_outbox_unavailable por el registro del proceso. Sin disco ni captura de logs no se garantiza conservación. Destinatario, canal, retención, acceso de operadores y recuperación siguen pendientes; no presentar esta bandeja como alerta entregada. No se envían mensajes a terceros en las pruebas.

## Verificación y límites

Desde services/api:

```powershell
rtk proxy uv sync --frozen
rtk proxy uv run --frozen ruff check .
rtk proxy uv run --frozen ruff format --check .
rtk proxy uv run --frozen pytest -ra
```

En este equipo se aprobaron 51 pruebas y se omitieron las PostgreSQL disponibles por falta de servidor local. CI ejecutó después las 83 sin omisiones, incluidas 32 de PostgreSQL. Incluye REG01–REG11, los doce escenarios SYN y pruebas adicionales de protocolo/privacidad. La suite conserva sus guardas de host/base/entorno y nunca debe apuntar a Neon. No sustituir PostgreSQL por SQLite.

Los casos SYN conservan datos fuente y su estado histórico pending_backend; la ejecución se evidencia por separado, no alterando los ejemplos ni presentando formas de JSON como pruebas de servidor. Las pruebas usan fecha fija y versiones/textos sintéticos; no cambian el reloj del equipo.

Quedan fuera: entrega real de alertas administrativas, consentimiento de participantes, autenticación y recuperación, despliegue HTTPS, cliente HTTP móvil/web, pruebas en teléfono, documentos y biometría. PERF01 sigue abierto. Word 01/02/03 reciben candidatos locales CAM013 y mantienen pendiente su render e inspección; no se sustituyen los vigentes sin esa verificación.

## Referencias técnicas

- [Argon2 perfiles](https://argon2-cffi.readthedocs.io/en/stable/parameters.html).
- [phonenumbers](https://pypi.org/project/phonenumbers/9.0.44/).
- [email-validator](https://pypi.org/project/email-validator/2.4.0/).
- [Bloqueos transaccionales PostgreSQL](https://www.postgresql.org/docs/16/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS).

## Evidencia de API02 confirmada

La [ejecución 46085546369](https://github.com/0kamiTori/Kora/actions/runs/46085546369), commit 3144c0cf42850ab6b0951cb87b734103e4d13398, aprobó sincronización del lock, Ruff y **83 pruebas sin omisiones**: 51 sin PostgreSQL y 32 de PostgreSQL/PostGIS. De estas últimas, 17 verifican el alta, incluyendo REG01–REG11 y los doce escenarios SYN. Foundation 46085546378 también aprobó. [Evidencia](API02_EVIDENCIA_CI.json).

Comprobación posterior con la configuración local de Neon: seis tablas conservadas, cero cuentas, preparación 200, política cerrada y POST 503; no se escribieron datos de prueba. La evidencia funcional de alta corresponde al contenedor de CI, no a un registro habilitado en Neon o a una APK conectada. No hay envío administrativo real: la bandeja sigue pendiente de canal. Revisión de John, consentimiento/contactos y Word pendientes. Los Word CAM013 se prepararon localmente, pero el renderizador confirmó que falta LibreOffice; se conservan los vigentes sin publicar candidatos. No se cierra fase.
