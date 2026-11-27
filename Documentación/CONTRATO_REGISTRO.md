# Contrato de la primera función de registro

26/11/2026 · CAM-2026-010 · RF01 contrato de alta v2 preparado para implementación. No es un servicio ejecutable ni una fase cerrada.

La APK 0.2.0 ya tiene formulario. Este paso fija su intercambio con el backend compartido para crear una única cuenta y registrar el consentimiento, sin conceder permisos de conductora o administración. No cambia las pantallas, la firma de la APK ni el alcance final.

## Versión y límites

El nuevo contrato es [registration-v2.openapi.json](Contratos/registration-v2.openapi.json), OpenAPI 3.1.1, revisión 2.0.0-draft.1. Define GET /api/v2/registration-policy y POST /api/v2/accounts. La versión v2 se introduce porque los campos obligatorios y el consentimiento explícito son incompatibles con el esquema inicial cerrado de v1. [Migración](Contratos/MIGRACION_REGISTRO_V2.md).

El [contrato inicial v1](Contratos/openapi.json) permanece intacto y parcial. No hay API o clientes HTTP funcionales desplegados que migrar. El resto del sistema no queda implementado por este contrato. Ambas versiones pertenecen a la misma identidad y base de datos, sin duplicar cuentas.

## Recorrido del registro

1. Consultar la política vigente. Sin texto de consentimiento aprobado o sin configuración necesaria, registration_enabled será false y consent será null; la APK no podrá crear cuentas reales. Los textos sintéticos solo existen en fixtures de prueba.
2. Mostrar los campos y el texto aprobado. El consentimiento empieza desmarcado; la aceptación de creación de cuenta no autoriza biometría ni carga documental.
3. Validar el formulario como orientación y convertir sus campos al contrato. Generar una Idempotency-Key UUID para ese envío lógico.
4. El servidor vuelve a validar todos los datos, la edad, la versión y aceptación del consentimiento y la disponibilidad de correo y número internacional. Nunca confiar en validación o reloj del teléfono.
5. Persistir en una transacción cuenta, credencial protegida, recibo de consentimiento e idempotencia. Restricciones únicas de base de datos garantizan que dos solicitudes simultáneas no creen dos cuentas con el mismo correo o teléfono.
6. Solo tras 201 confirmar la creación. Sin respuesta concluyente, mostrar estado incierto y reintentar con la misma clave y el mismo cuerpo; no mostrar cuenta creada sin confirmación.

El alta no emite tokens de sesión ni presenta automáticamente la solicitud de conductora. La cuenta nace con roles=[passenger], driver_approved=false y driver_review_status=not_submitted. requested_role=driver expresa intención para el recorrido posterior. La aprobación, dos apelaciones y espera de 30 días siguen en sus historias y bajo control de servidor.

Una versión aprobada de consentimiento identifica un texto inmutable. Conservar su texto o referencia y huella íntegra junto con los recibos; cualquier cambio de contenido exige una versión nueva. No reutilizar el mismo identificador para otra redacción ni reescribir la evidencia de autorizaciones anteriores.

## Correspondencia de campos

| Formulario Android | Contrato | Validación del servidor |
|---|---|---|
| Correo electrónico | email | Formato válido; espacios exteriores eliminados y minúsculas para unicidad. No quitar puntos ni sufijos + del proveedor. Límite técnico 254 caracteres. |
| Contraseña | password | Mínimo 12 caracteres con mayúscula, minúscula, número y símbolo distinto de espacio. No recortar, transformar ni truncar; no máximo individual nuevo. Cuerpo total limitado a 16 KiB como propuesta técnica. |
| Nombre de usuario | display_name | NFC y quitar espacios exteriores; mantener interiores, letras españolas con tildes/ñ, números y espacios; de 1 a 100 caracteres. Sin unicidad. |
| Fecha DD/MM/AAAA | birth_date | Fecha civil YYYY-MM-DD sin hora. No futura y edad >=18 por fecha del servidor en America/Bogota. No convertir a un instante que pueda desplazar el día. |
| Código de país | phone.country_calling_code | Código internacional con +; no basta comprobar que tenga entre uno y tres dígitos. |
| Celular | phone.national_number | Interpretar junto al código con biblioteca de numeración, normalizar a E.164 y comprobar unicidad del número completo. Esto no verifica titularidad o existencia de la línea. |
| Pasajera o quiero conducir | requested_role | passenger o driver como intención, nunca admin ni permisos aprobados. |
| Consentimiento | consent.accepted y consent.version | accepted debe ser true y version debe corresponder al texto vigente aprobado. Registrar hora del servidor, no una hora declarada por el cliente. |

La normalización precede las comprobaciones de formato y longitud del nombre y correo; las claves inesperadas se rechazan. La contraseña queda fuera de esa normalización. Las decisiones técnicas se registran como revisables, sin atribuir nueva aprobación explícita del usuario.

Para cumpleaños del 29 de febrero se propone el 1 de marzo en años no bisiestos, de forma consistente con el cálculo local actual; revisar este criterio antes de habilitar datos reales. El contrato no sustituye la comprobación documental de edad prevista para la habilitación de conductora.

## Respuestas y mensajes

| HTTP | Caso | Comportamiento |
|---|---|---|
| 201 | Alta confirmada o reproducción de éxito por misma clave/cuerpo | Mismo UUID y cuerpo de cuenta creada; cabecera Idempotency-Replayed distingue reproducción. No devuelve contraseña, correo, teléfono, documento ni token de sesión. |
| 422 | Faltan campos, consentimiento o formato inválido | Mensaje y field_errors con los nombres de campos, sin repetir sus valores. Mantener los textos acordados en RF01_REGISTRO.md. |
| 409 | Correo o celular ocupado | Este correo o número no está disponible. No indicar cuál ni devolver el ID de la cuenta existente. |
| 409 | Cambió el consentimiento | Solicitar aceptación explícita de la nueva versión; nunca marcar la casilla automáticamente. |
| 409 | Clave de idempotencia usada con otro cuerpo | Conflicto controlado; no ejecutar de nuevo con datos distintos bajo la misma clave. |
| 400, 413, 415 | JSON inválido, cuerpo excesivo o medio no admitido | Rechazo controlado. No eco de cuerpo, SQL o datos personales. |
| 429 | Límite de intentos | Respetar Retry-After; límite concreto pendiente de dimensionamiento. |
| 503 | Registro no habilitado o base no disponible | Distinguir los códigos REGISTRATION_DISABLED y DATABASE_UNAVAILABLE; no inventar éxito ni volver a un registro local. |
| 500 | Error interno inesperado | Mensaje genérico acordado e incidente saneado para administración. |

Los códigos y mensajes completos están en x-error-codes del contrato. Los textos nuevos de protocolo, como límite de intentos o conflicto de idempotencia, son redacción técnica revisable. Los mensajes expresamente acordados con el usuario no se cambian.

Orden propuesto: detectar campos obligatorios ausentes; si solo falta o es falso el consentimiento, usar su mensaje específico. Si concurren otros vacíos, usar el mensaje general y añadir el error específico de consentimiento en field_errors. Después validar email, password, display_name, birth_date y phone, conservando errores por campo. No ejecutar escritura hasta superar todas las reglas. Conflictos de persistencia se traducen al mensaje acordado, sin detalles de SQL.

## Reintentos y concurrencia

TTL técnico propuesto: 24 horas para el recibo de idempotencia. Misma clave y contenido equivalente producen el mismo 201, incluso si la primera respuesta se perdió. El servidor debe serializar intentos concurrentes con la misma clave antes de comprobar unicidad; solicitudes con claves distintas y contacto repetido producen un único alta y un conflicto.

El recibo guarda una huella HMAC con secreto separado del almacenamiento, no el formulario ni la contraseña en claro. La credencial de cuenta se protegerá con hash adecuado al implementar el backend. La equivalencia considera los campos normalizados y la contraseña exacta. Cambiar el formulario corresponde a un envío lógico nuevo; no cambiar la clave automáticamente al perder una respuesta. Después del vencimiento del recibo, comprobar el resultado mediante acceso o recuperación, sin afirmar que el alta falló ni crear una cuenta alternativa.

Un éxito ya persistido y coincidente se reproduce antes de exigir la política nueva: confirma un alta anterior, no crea otra ni necesita una nueva aceptación. Si la primera operación sigue en curso, se puede devolver 409 REGISTRATION_IN_PROGRESS con Retry-After; conservar la clave y el cuerpo y no confundirlo con un conflicto de contenido. No cachear fallos 500/503 como éxitos o resultados definitivos. Si una transacción confirmó pero se perdió su respuesta, el recibo permite recuperar su 201 al restablecer la conexión.

## Incidentes y consentimiento pendientes

DATABASE_UNAVAILABLE e INTERNAL_ERROR requieren registro y aviso administrativo con incident_id y request_id. Diagnóstico saneado sin contraseña, token, cadena de conexión, biometría, documentos ni formulario completo. El canal no puede depender exclusivamente de la base que falló. Retención, destinatario y recuperación del canal siguen pendientes; no hay alertas reales implementadas en este paso.

Julian Hernando Perez Villamizar se declara responsable del tratamiento. Se prepara un [borrador de consentimiento](CONSENTIMIENTO_CUENTA_BORRADOR.md), sin aprobación legal o institucional atribuida. Contactos, conservación, proveedores, condiciones operativas y revisión del texto siguen pendientes. Esto no bloquea preparar API y pruebas con datos sintéticos; sí impide habilitar el registro público con datos reales. La conexión Neon no se utiliza ni modifica en esta tarea y no se guarda la credencial compartida anteriormente.

## Evidencia y siguiente historia

Los [49 ejemplos de esquema](Contratos/examples/registration-v2-cases.json) cubren campos, categorías de contraseña, consentimiento, privilegios, respuestas y privacidad. Un ejemplo menor de edad es válido para JSON Schema y queda expresamente pendiente de rechazo por el servidor; no se presenta como prueba de negocio aprobada.

También se preparan [12 escenarios sintéticos](DATOS_PRUEBA_REGISTRO.md) con datos, dependencias y resultados esperados para backend. Se comprueban sus formas, no se ejecutan cuentas ni solicitudes. No usar esos datos o el consentimiento de prueba en producción.

Ejecutar python scripts/validate_registration_contract.py después de instalar scripts/requirements-contracts.txt en un entorno de herramientas. Valida esquemas JSON Schema 2020-12, referencias internas, ejemplos y resguardos del contrato, no todo OpenAPI ni un backend. Foundation conserva su comprobación previa y CI añade este control independiente. No son dependencias de FastAPI.

La siguiente historia será la base API y persistencia de registro con migraciones y pruebas reales: éxito, consentimiento ausente/cambiado, edad, duplicados simultáneos, reintento, privilegios y caída de base con incidente. Julian y John deben asignar implementador y revisor de esa historia antes de código compartido. No crear otra base de cuentas en Android o web.

| Caso de integración pendiente | Resultado exigido |
|---|---|
| REG01 Alta válida | Una cuenta y recibo; roles passenger, sin sesión ni aprobación de conductora. |
| REG02 Consentimiento no vigente o ausente | Ninguna cuenta; mensaje específico y nueva aceptación si cambia la versión. |
| REG03 Fecha y edad | Fecha futura/inexistente rechazada; quien cumple 18 hoy supera la regla; menor rechazada por servidor. |
| REG04 Unicidad concurrente | Dos claves con mismo correo o teléfono crean una cuenta; el otro envío recibe 409 genérico. |
| REG05 Nombre compartido | Mismo nombre con contactos distintos permite dos cuentas. |
| REG06 Reintento y concurrencia de clave | Misma clave/cuerpo produce un solo alta y el mismo UUID; proceso en curso no consume otra operación. |
| REG07 Conflicto de clave | Misma clave con cuerpo distinto devuelve 409, sin cambiar la cuenta original. |
| REG08 Respuesta perdida y política nueva | Reproducir el éxito persistido sin crear otra cuenta ni exigir aceptación retroactiva. |
| REG09 Caída e incidente | Ningún éxito ficticio; aviso y diagnóstico saneados aun cuando falle la base. |
| REG10 Intento de privilegios | Rechazar campos o roles administrativos y no habilitar conductora por requested_role. |
| REG11 Consentimiento no aprobado | Registro nuevo deshabilitado; solo pruebas aisladas con datos sintéticos hasta resolverlo. |

Estos casos no se ejecutan en el verificador de esquemas ni se marcan aprobados antes de existir backend y base de pruebas.

Fuentes técnicas: [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html) y [jsonschema 4.26.0](https://pypi.org/project/jsonschema/). Son referencias del formato y herramientas, no evidencia de implementación.

Comprobación remota: [Foundation checks 45941147338](https://github.com/0kamiTori/Kora/actions/runs/45941147338), commit ba5c7bd984fe9cf6e702b58d125a3dee9b91b440, terminó correctamente con la verificación inicial, 49 fixtures, forma de 12 escenarios sintéticos y sintaxis YAML. No ejecutó registro o base de datos.

## Implementación parcial API01

API01 implementa GET /api/v2/registration-policy en modo cerrado y una puerta POST /api/v2/accounts que siempre responde 503 REGISTRATION_DISABLED sin interpretar credenciales ni escribir datos. No implementa todavía validación y alta REG01–REG11. Su OpenAPI automático muestra solo lo disponible; no reemplaza el contrato objetivo. Se inicializan tablas y migraciones como preparación, descritas en [BASE_API.md](BASE_API.md). No hay cambios incompatibles en los cuerpos del contrato v2 ni cambios al v1.
