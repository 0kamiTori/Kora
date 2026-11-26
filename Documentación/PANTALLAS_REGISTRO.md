# Pantallas móviles de registro y revisión

Historia APP02 · CAM-2026-009 · 26/11/2026 · Aplicación 0.2.0+2.

Se implementan las pantallas Flutter de registro, solicitud de conductora, estado y apelación con el tema premium y el acento personal existente. El usuario pidió las pantallas después de acordar dos apelaciones y una espera de 30 días para volver a solicitar habilitación tras rechazo definitivo. Es una historia de interfaz verificable; no implementa cuentas, revisión administrativa, biometría o persistencia compartida.

## Acceso y comportamiento

| Pantalla | Ruta desde Perfil | Comportamiento |
|---|---|---|
| Registro | Crear mi cuenta | Selección pasajera/futura conductora, campos obligatorios, contraseña visible u oculta, consentimiento y validación local. Revisar mis datos no crea una cuenta; informa que el servicio no está conectado. |
| Solicitud | Ser conductora | Colombia y automóviles, conservación de cuenta y requisitos documentales obligatorios para integración posterior. No activa cámara ni permite cargar documentos. Enviar está deshabilitado. |
| Estado | Mi solicitud | Consume un modelo de revisión preparado para datos de servidor. Por defecto muestra servicio no disponible, sin inventar decisiones. |
| Apelación | Mi solicitud y Consultar apelaciones | Motivo obligatorio, estado de revisión y máximo dos oportunidades. Sin una solicitud rechazada y autorización de servidor no permite enviar. |

Rutas: /profile/register, /profile/driver/request, /profile/driver/status y /profile/driver/appeal. La preferencia premium sigue aplicándose globalmente. El panel administrativo pertenece a la web de John y no se crea en Android.

## Reglas acordadas de conductora

Primera entrega limitada a Colombia y automóviles. Los campos de identidad, licencia, automóvil y fotografías propuestos fueron aceptados como obligatorios para completar la habilitación, pero el usuario aplazó su integración. Se muestran como requisitos, sin capturar documentos reales. La biometría sigue en segunda entrega.

Estados: borrador, pendiente de revisión, requiere correcciones, rechazada, apelación pendiente y aprobada administrativamente. El formulario no modifica estos estados por sí mismo. Las correcciones no son apelaciones. Administración y solicitante deben indicar motivo al resolver y presentar una apelación, respectivamente.

Cada solicitud admite dos apelaciones. Solo una puede estar pendiente. La segunda se habilita tras resolver la primera manteniendo el rechazo. Los reintentos de red no consumen nuevas oportunidades. Debe conservarse la solicitud, motivos, decisiones, fechas y autoría; el historial persistido sigue pendiente de backend y contrato.

Tras resolver la segunda apelación manteniendo el rechazo, una nueva solicitud de conductora debe esperar 30 días desde esa decisión definitiva. Esta es la interpretación operativa de rechazo definitivo en el recorrido aprobado, no del primer rechazo que aún admite apelaciones. Se propone un intervalo de 30 × 24 horas con fechas UTC y presentación en Colombia; el servidor deberá fijar y comprobar el instante. La cuenta de pasajera se conserva. Cambiar la fecha del teléfono no habilita la nueva solicitud.

La pantalla muestra nextApplicationAt y permisos recibidos del servidor, no calcula autorización con el reloj local ni reinicia intentos. El contador, el plazo, el control de concurrencia, la deduplicación y la nueva solicitud todavía no se ejecutan contra un servicio. No se autoriza un viaje con aprobación administrativa o biometría simuladas.

## Validaciones y límites

Se reutilizan los mensajes literales de [RF01](RF01_REGISTRO.md). Se comprueban vacíos, consentimiento explícito, contraseña de mínimo 12 caracteres y sus cuatro categorías, nombre de hasta 100 caracteres con letras españolas/números/espacios y edad cumplida por fecha, sin aproximación de días/365. Mensaje auxiliar de nombre inválido y política de prioridad son decisiones de interfaz revisables, no nuevos acuerdos del usuario.

El teléfono se normaliza por código y número nacional. La comprobación local es de estructura internacional y, para +57, del patrón de celular de diez dígitos iniciado en 3. No verifica asignación, titularidad o existencia; la validación completa del plan de numeración y unicidad de correo/teléfono requiere backend. Para otros códigos no se afirma validación nacional completa. La fecha local sirve únicamente para orientación del formulario; la edad definitiva se validará en servidor. El caso de cumpleaños 29 de febrero y la política del correo siguen pendientes.

No se guardan datos del registro, contraseña o motivo en SharedPreferences, archivos ni logs. Los controladores de campos se destruyen al salir. No se crean identidades locales alternativas. No hay alertas administrativas reales ante errores, porque aún no existe el servicio; canal operativo e incidentes siguen pendientes.

## Comprobación

Análisis estático sin incidencias y 20 pruebas funcionales locales aprobadas para la aplicación completa; dos pruebas opcionales de captura se omiten en la ejecución normal. APP02 añade nueve pruebas: fecha/edad, contraseña/nombre/teléfono, elegibilidad de apelación, errores de formulario, ausencia de alta ficticia, motivo y envío no simulado, bloqueo con apelación pendiente o agotada, presentación de fecha de nueva solicitud y texto al 200 %. Se ajustó el desplazamiento del test anterior de Apariencia para pulsar el control visible al crecer Perfil.

Capturas Flutter de revisión en [Diseno/ImplementacionAPP02](Diseno/ImplementacionAPP02/README.md). Los escenarios de rechazo y apelación solo se inyectan desde test; la aplicación distribuida muestra estado no disponible hasta conectar backend. Son renderizados de widgets, no prueba de un teléfono ni resultado administrativo real. No hay nuevas dependencias; versiones existentes conservadas.

No se ha construido ni instalado esta versión en Android local: falta SDK Android. La compilación remota, si se genera, se documentará con su ejecución real. El reporte correcto de la primera APK por el usuario no valida automáticamente APP02.

## Siguiente historia

Cerrar contrato de registro y solicitud, asignar implementador y revisor compartidos y construir el backend con identidad y persistencia únicas. Completar el formulario documental y panel web cuando se retome su integración. El acceso, recuperación de cuenta, decisiones administrativas, alertas de incidentes, almacenamiento protegido, dos apelaciones y espera de 30 días deben probarse con API y base real antes de aceptarlos como funcionales.
