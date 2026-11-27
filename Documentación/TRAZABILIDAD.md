# Trazabilidad y aceptación del sistema
24/11/2026. Criterios mínimos de visión; completar SRS y casos detallados en F1. Todos los RF están no implementados; cobertura OpenAPI indica solo diseño. Ambos autores son responsables del backend; Julian de APK y John de web.
| RF | Criterio mínimo | Fase | Cobertura del contrato y brecha | Estado |
|---|---|---|---|---|
| RF01 | CA01: alta válida y duplicada, rechazo de consentimiento ausente y de acceso por rol indebido; revocación efectiva. | F3 | Parcial: registerAccount, login, getMyAccount; faltan renovación, revocación y gestión completa del consentimiento. | No implementado |
| RF02 | CA02: pendiente, rechazada o suspendida no acepta viajes; solo administración autorizada cambia aprobación. | F3 | Faltan operaciones administrativas y modelo completo de revisión. | No implementado |
| RF03 | CA03: un viaje conserva el mismo ID en APK y web; repetir operación no duplica; transición inválida o ajena es rechazada. | F3 | Parcial: requestTrip, getTrip, transitionTrip; completar búsqueda, asignación e historial. | No implementado |
| RF04 | CA04: identidad y vida vigentes permiten ready; fallo, vencimiento, indisponibilidad o intento de reproducción impiden autorizar el inicio. | F3 | Parcial: requestVerification y getVerification; faltan evidencia segura, vigencia, política y referencia biométrica. | No implementado |
| RF05 | CA05: desafío interactivo no aparece en movimiento; diferido, vencido o fallido queda visible y aplica protocolo, sin marcar identidad confirmada. | F4 | Faltan política, diferimiento y tratamiento de verificación vencida. | No implementado |
| RF06 | CA06: móvil y web usan la misma versión; un cambio no autorizado no borra una desviación ni reescribe el historial. | F4 | Faltan cálculo y revisiones de ruta. | No implementado |
| RF07 | CA07: cola sin red recupera sin duplicados; posición atrasada queda histórica; imprecisión y señal perdida no aparentan ubicación actual. | F4 | Parcial: uploadPositions; completar políticas de calidad y evaluación de anomalías. | No implementado |
| RF08 | CA08: entradas conocidas reproducen nivel y factores; calibración separada de evaluación; no ocultar datos insuficientes. | F4 | Faltan reglas, versión e índice en modelos y respuestas. | No implementado |
| RF09 | CA09: una alerta sin red figura pendiente; reintento no duplica; created, dispatched, delivered, acknowledged y resolved requieren evidencia distinta. | F5 | Parcial: createSilentAlert, acknowledgeAlert; faltan consulta, entrega, escalamiento y resolución. | No implementado |
| RF10 | CA10: enlace vencido, revocado o de otro viaje es rechazado; limitar intentos y registrar accesos conforme a política. | F5 | Faltan creación, consulta y revocación de enlaces. | No implementado |
| RF11 | CA11: ambos clientes muestran IDs y versiones coherentes; tras desconexión recuperan eventos y señalan datos desactualizados. | F5 | Parcial: getTrip, getTripEvents, createEventTicket; completar instantánea y permisos de lectura. | No implementado |
| RF12 | CA12: toda acción sensible es trazable; una operadora sin permiso no consulta ni cambia el recurso. | F5 | Faltan listados, filtros, parámetros y auditoría administrativa. | No implementado |
| RF13 | CA13: solicitud autenticada queda trazable; revocar acceso y eliminar o retener justificadamente cada dato; comunicar resultado según política. | F5 | Faltan solicitudes, ejecución y trazabilidad de conservación/eliminación. | No implementado |

## Calidad
| ID | Evidencia exigida | Estado |
|---|---|---|
| RNF01 | Cero accesos ajenos exitosos en batería de roles y recursos; TLS fuera de local, hash robusto, secretos fuera de Git y pruebas de tokens revocados. | No evaluado |
| RNF02 | Consentimiento previo a captura; cifrado y acceso mínimo a datos sensibles; probar vencimiento de enlaces y procedimiento de eliminación. | No evaluado |
| RNF03 | Meta p95 recepción GPS → evento persistido ≤ 5 s con red; medir aparte entrega al cliente. Declarar equipo, concurrencia, red y número de muestras. | No evaluado |
| RNF04 | Meta: marcar posición desactualizada al superar 30 s desde el último dato válido con reloj coherente. Recuperar cola y eventos sin duplicados tras corte y reinicio. | No evaluado |
| RNF05 | Meta de éxito ≥ 90 % en tareas críticas del protocolo. Informar participantes, tareas, errores y condiciones; evaluar percepción de seguridad sin inferir reducción de incidentes. | No evaluado |
| RNF06 | Metas experimentales FAR ≤ 1 % y FRR ≤ 5 %. Reportar conteos, intervalos de confianza y condiciones; probar detección de vida por separado y no certificar tasas con muestras insuficientes. | No evaluado |
| RNF07 | Metas sensibilidad ≥ 90 % y viajes normales con falsa alerta ≤ 10 %. Definir verdad de referencia y denominadores; separar calibración y evaluación. | No evaluado |
| RNF08 | Otro integrante instala desde versiones y locks, migra una base limpia, restaura respaldo y ejecuta guion integral sin secretos en repositorio. | No evaluado |

## Condición para aceptar cada historia
Registrar caso, precondiciones, datos sintéticos o autorizados, entorno, esperado, observado, resultado, commit y enlace de evidencia sin datos sensibles. Incluir éxito, fallo, permisos, duplicados y desconexión cuando corresponda. El implementador adjunta evidencia y el otro integrante revisa. El SRS detalla campos y errores antes del código.

## Brechas de API
El contrato actual tiene 13 operaciones REST y un diseño de eventos; no cubre todos los RF. No ampliar ni dar por implementado un endpoint por aparecer en esta matriz. En F1 completar primero los contratos necesarios para la historia inicial. Una verificación necesita issued_at, expires_at, policy_version y vínculo inequívoco a conductora y viaje; definir payload de evidencia y retención antes de implementarlo. Actualizar contratos, fixtures y clientes juntos.

## Cierre del sistema
RF01–RF13 y RNF01–RNF08 deben tener evidencia y revisión. Reportar metas no alcanzadas y defectos; no declarar aceptación total con controles de seguridad fallidos o datos de evaluación insuficientes. La revisión técnica de autores no reemplaza la aceptación académica.

## Detalle de interfaz APP01

RF11 y RNF05 se complementan con apariencia premium configurable. Criterios y límites en [MOVIL_APARIENCIA.md](MOVIL_APARIENCIA.md). APP01 implementada con pruebas locales: presets, selector, cancelación, restauración, errores y escrituras ordenadas. Prueba física Android pendiente; RF11 y RNF05 completos continúan pendientes. No se dan por implementados identidad, GPS o viajes.

## Detalle de RF01 para primera entrega

26/11/2026 · CAM-2026-008. [RF01_REGISTRO.md](RF01_REGISTRO.md) recoge campos, validaciones, mensajes literales y casos de aceptación acordados; todos pendientes de ejecución. RF02 requiere completar solicitud y revisión administrativa. RF04 se desarrollará e integrará en segunda entrega; no se acepta por una revisión manual ni se habilitan viajes en el primer avance. El contrato sigue parcial y no se declara implementado.

El usuario reporta prueba correcta de la primera APK en Redmi Note 15 Pro con Android 16. Es evidencia declarada de funcionamiento general; los casos específicos de accesibilidad, persistencia y rendimiento no están documentados. RF11 y RNF05 completos siguen pendientes.

## Interfaz APP02 y brecha de integración

APP02 implementa pantallas y validación local de RF01/RF02, con nueve pruebas nuevas y capturas Flutter. La matriz RF sigue pendiente en su conjunto: correo/teléfono únicos, sesiones, revisión, dos apelaciones, deduplicación y plazo de 30 días necesitan servidor y pruebas de integración. No cambia OpenAPI. Detalle y límites en [PANTALLAS_REGISTRO.md](PANTALLAS_REGISTRO.md).

## Contrato RF01 en CAM 2026 010

Registro y política cuentan con diseño v2 separado, preservando v1. Detalle en [CONTRATO_REGISTRO.md](CONTRATO_REGISTRO.md), migración y casos REG01–REG11 de integración aún pendientes. 49 ejemplos JSON Schema validados; no prueban edad del servidor, unicidad, transacciones, idempotencia o alertas reales. RF01 sigue sin implementar. Reporte general de APP02 correcto con tirones en [PRUEBA_APP02.md](PRUEBA_APP02.md); no cierra RNF05 ni rendimiento.

## Evidencia acotada de API01

API01 aporta infraestructura para RF01 y RNF08: salud, preparación, migración y tablas compartidas. Las pruebas PostgreSQL verificarán restricciones, concurrencia de contactos y protección de consentimiento/recibos; no validan todavía el flujo REG01–REG11 de alta. RF01, autenticación, incidentes administrativos y revisión siguen pendientes. Local sin DB: 13 aprobadas y 15 omitidas con motivo; CI real pendiente de registrar. Ningún RF o fase se cierra por inicializar esta base.
