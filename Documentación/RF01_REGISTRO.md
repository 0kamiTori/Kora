# Registro de cuentas y aprobación de perfiles

26/11/2026 · CAM-2026-008 · Requisitos acordados con el usuario; implementación pendiente.

La primera entrega oficial será un avance académico de registro y aprobación, sin viajes operativos. Este documento recoge las decisiones del diálogo para RF01 y la separación de RF02 y RF04. No acredita aprobación académica, contrato completo ni funcionamiento del registro.

## Perfiles y entregas

Pasajeras y conductoras crean su cuenta desde la misma aplicación Android. Una pasajera puede solicitar habilitación para conducir conservando la misma cuenta. La cuenta de pasajera no requiere intervención administrativa rutinaria. La solicitud de conductora sí requiere revisión; su aprobación administrativa no equivale a identidad biométrica verificada ni permite operar viajes en esta entrega.

Administración accede por un panel web separado. Las cuentas administradoras se crean mediante un procedimiento controlado de la casa administradora, sin registro público ni asignación de ese permiso desde Android. Durante las pruebas se usará una cuenta administradora; sus credenciales y el mecanismo de creación siguen pendientes.

La primera entrega abarca registro, acceso por correo y contraseña, recuperación de acceso y aprobación administrativa de perfiles. Las condiciones detalladas del correo de verificación, recuperación, sesiones, solicitud y revisión se definirán antes de implementar cada historia. No hay fecha específica acordada para este avance ni para la segunda entrega. Se conserva el objetivo tentativo del sistema completo del 14/01/2027 y su revisión de viabilidad.

La captura facial, comparación de identidad y detección de vida se desarrollarán e integrarán en la segunda entrega. No se solicitan capturas faciales como requisito del registro inicial. Los documentos de identidad, licencia y vehículo pertenecen a la solicitud de conductora y necesitan definir campos, evidencias, criterios y tratamiento antes de captar datos reales. No se elimina la biometría del alcance final ni se sustituye por una simulación. Su finalidad será verificar identidad, no inferir género por el rostro; la política de elegibilidad del servicio queda pendiente de definición y revisión.

## Campos obligatorios compartidos

| Campo | Regla acordada |
|---|---|
| Correo electrónico | Obligatorio, formato válido y único entre todas las cuentas. |
| Contraseña | Obligatoria; mínimo 12 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial. |
| Nombre de usuario | Obligatorio, máximo 100 caracteres; permite letras con tildes y ñ, números y espacios. Excluye símbolos especiales. Puede repetirse entre cuentas. |
| Fecha de nacimiento | Obligatoria, fecha de calendario válida, no futura y edad mínima de 18 años cumplidos. No estimar la edad dividiendo días entre 365. |
| Celular y código de país | Ambos obligatorios; juntos deben formar un número válido y único. |
| Consentimiento para crear cuenta | Obligatorio y aceptado explícitamente. Su contenido y versión requieren definición antes de uso real. No equivale a autorización biométrica. |

## Unicidad y normalización del teléfono

La unicidad se aplica al número internacional completo normalizado, no al número nacional aislado. Un mismo número nacional con códigos de llamada diferentes puede registrarse en cuentas distintas si ambas combinaciones son válidas. Cambiar espacios, guiones o la presentación del mismo número completo no crea otro teléfono. Compartir código entre países tampoco permite duplicar un mismo número internacional. No basta anteponer un código arbitrario: se valida la combinación.

Como propuesta técnica para el contrato se usará una representación internacional E.164 y un identificador UUID interno para cada cuenta. El nombre visible nunca se utilizará como clave única. La biblioteca de teléfonos, reglas de normalización del correo y detalles de Unicode se fijarán al preparar la implementación.

## Mensajes acordados

Los textos siguientes se conservan literalmente, incluida la redacción solicitada. La validación debe identificar los campos afectados además del mensaje general.

| Caso | Texto |
|---|---|
| Campos obligatorios incompletos | !OJO! faltan datos obligatorios |
| Consentimiento ausente | !OJO! Confirma tu consentimiento para crear la cuenta |
| Correo o número ya registrado | Este correo o número no está disponible |
| Correo o número inválido | Este correo o número es inválido, prueba otro |
| Contraseña inválida | La contraseña debe tener mínimo 12 caracteres e incluir una mayúscula, una minúscula, un número y un carácter especial |
| Fecha inexistente o futura | Ingresa una fecha de nacimiento válida |
| Edad inferior a 18 años | Debes tener al menos 18 años para crear una cuenta |
| Fallo de base de datos o error interno inesperado | Hubo un error para registrate, intentalo nuevamente más tarde |

El mensaje de nombre inválido y la prioridad de varios errores tienen redacción técnica propuesta en APP02 y CONTRATO_REGISTRO.md, revisable sin atribuir aprobación adicional del usuario. La falta de consentimiento debe poder identificarse expresamente, sin quedar oculta por el mensaje genérico. No se cambia el mensaje de error interno sin acuerdo del usuario.

## Incidentes técnicos y administración

Un fallo interno de registro, incluida indisponibilidad de base de datos o una excepción inesperada, debe generar alerta a administración y un registro diagnóstico asociado. No debe confundirse esta alerta operativa con una alerta de seguridad de viaje. Los errores normales de validación y duplicados no son incidentes internos.

El diagnóstico excluirá contraseñas, tokens, cadenas de conexión, imágenes documentales, datos biométricos y el contenido completo del formulario. La propuesta técnica es un identificador de incidente con hora, operación, categoría y traza saneada, consultable solo por administración autorizada. Canal, destinatario, retención, deduplicación y recuperación si la misma base está caída quedan pendientes. No hacer depender exclusivamente de esa base la evidencia de su propio fallo.

## Criterios verificables antes de aceptar el registro

| Caso | Resultado esperado |
|---|---|
| Datos válidos y consentimiento | Se crea una sola cuenta y un identificador compartido; no se otorga administración ni aprobación de conductora automáticamente. |
| Campo obligatorio vacío | No se crea cuenta y aparece el mensaje de campos obligatorios. |
| Consentimiento ausente | No se crea cuenta y aparece su mensaje específico. |
| Contraseña de 11 caracteres o sin alguna categoría | Se rechaza con el mensaje acordado; una de 12 con todas las categorías supera esa validación. |
| Nombre repetido | Se permite si correo y número internacional no están registrados. |
| Nombre de más de 100 caracteres o con símbolos | Se rechaza; mensaje específico pendiente. Letras con tildes, ñ, números y espacios son admitidos. |
| Fecha inválida, futura o menor de edad | Se rechaza con el mensaje correspondiente; quien cumple 18 años en la fecha de referencia supera la regla de edad. |
| Correo o número internacional duplicado | No se crea una segunda cuenta y aparece el mensaje de indisponibilidad. |
| Mismo teléfono con distinto formato | Se detecta el duplicado después de normalizar. |
| Mismo número nacional con otro código válido | Se permite si el número internacional resultante es válido y no está registrado. |
| Dos solicitudes concurrentes con el mismo correo o teléfono | Solo una crea cuenta; la otra recibe conflicto controlado. No basta validarlo únicamente en Android. |
| Doble pulsación o reintento tras corte | No se crean cuentas duplicadas; el mecanismo de reintento y recuperación se definirá en el contrato. |
| Error interno | Mensaje genérico, sin detalles técnicos al cliente; incidente y alerta saneados sin secretos. |
| Solicitud de conductora | Conserva cuenta e historial; revisión administrativa separada de verificación biométrica. |
| Permiso administrativo solicitado desde Android | Rechazo del backend; no se concede por un campo enviado por el cliente. |

## Pendientes para completar el contrato

El OpenAPI actual es parcial y no se modifica en este cambio documental. Contrastar el registro y los roles existentes con una cuenta que puede tener ambos perfiles; fijar payloads, códigos de error, respuestas, concurrencia y migración antes de cambiarlo. La aprobación debe tener trazabilidad y autorización en backend.

Los campos y estados de conductora ya fueron acordados, con integración aplazada. Contrato v2 y normalización se concretan técnicamente en CONTRATO_REGISTRO.md. Siguen pendientes los criterios de revisión documental, creación controlada del primer administrador, texto aprobado de consentimiento y contactos del responsable declarado, revisión del criterio de cumpleaños del 29 de febrero, verificación/recuperación de correo y canal operativo de incidentes. No presentar esos pendientes como aprobados.

Julian desarrolla móvil, John web y ambos backend. Asignar implementador y revisor por historia antes de código compartido. Todos los casos de esta sección están pendientes de ejecución; no se cierra ninguna fase.

## Sincronización Word pendiente

CAM-2026-008 queda registrado en los documentos de texto. Las versiones actualizadas de Word 01/02/03 están preparadas localmente, pero el renderizador no dispone de LibreOffice y Word no completó la exportación a PDF. Se preservan los Word vigentes anteriores hasta renderizar e inspeccionar las nuevas versiones; no declarar completa la sincronización documental ni publicar candidatos sin revisión.

## Solicitud y apelaciones acordadas en CAM 2026 009

Primera entrega para Colombia y automóviles. Se aceptan como obligatorios los campos y evidencias de identidad, licencia y vehículo descritos en [PANTALLAS_REGISTRO.md](PANTALLAS_REGISTRO.md), con integración aplazada por el usuario. Se conservan cuenta y rol pasajera al solicitar ser conductora. La revisión se realiza desde el panel administrativo web.

Estados acordados: borrador, pendiente de revisión, requiere correcciones, rechazada, apelación pendiente y aprobada. Rechazo y petición de correcciones tienen motivo obligatorio. La solicitante puede apelar hasta dos veces por solicitud, con motivo obligatorio; administración revisa y responde con motivo. Una sola apelación pendiente; la segunda se habilita si la primera mantiene el rechazo. Conservar historial y no consumir intentos por reintentos de red.

Tras el rechazo definitivo de la segunda apelación, debe esperar 30 días para iniciar una nueva solicitud de conductora. El instante y la autorización los fijará el servidor; la propuesta operativa es 30 × 24 horas desde la decisión definitiva. No se bloquea automáticamente su cuenta de pasajera. Pantallas APP02 implementadas; envío, aprobaciones, historial y plazo persistido siguen pendientes de API. Este apartado resuelve la definición de estados y campos antes listada como pendiente, sin dar por terminados sus criterios documentales o integración.

## Contrato v2 preparado en CAM 2026 010

[CONTRATO_REGISTRO.md](CONTRATO_REGISTRO.md) define política y alta en /api/v2; esquemas, errores, campos y plan de migración en Contratos. El v1 permanece intacto por incompatibilidad de campos obligatorios y consentimiento. 49 casos de esquema comprobados, sin backend ni consultas a Neon.

Se concretan como decisiones técnicas normalización de correo sin distinguir mayúsculas, NFC y quitar espacios exteriores del nombre sin unicidad, fecha civil de servidor en Colombia y prioridad de errores; son revisables, no acuerdos adicionales atribuidos al usuario. El texto aprobado de consentimiento y los contactos del responsable declarado siguen pendientes. Casos de negocio, sesiones, solicitud, apelaciones y espera continúan sin implementar.

## Responsable y escenarios sintéticos

Julian Hernando Perez Villamizar se declara responsable. El [borrador de consentimiento](CONSENTIMIENTO_CUENTA_BORRADOR.md) requiere completar contactos y revisión; no habilita el registro real. La [guía de datos sintéticos](DATOS_PRUEBA_REGISTRO.md) añade 12 escenarios de integración preparados, no ejecutados. No usar test-account-consent-v1 con personas reales.
