# Contrato de integración entre móvil y web

Los dos clientes usarán el backend compartido y la misma base de datos. El registro se prepara en /api/v2 según [CONTRATO_REGISTRO.md](CONTRATO_REGISTRO.md); las rutas /api/v1 de este documento siguen como diseño inicial parcial sin implementación. No habrá sincronización directa entre teléfonos y navegador ni acceso de clientes a PostgreSQL. La API asigna IDs, valida identidad y roles, decide transiciones y persiste cambios. La introducción de v2 no duplica cuentas, identidades o almacenamiento.

## Entidades y estados

Identificadores UUID para cuenta, conductora, viaje, posición, verificación, alerta y evento. Fechas ISO 8601 UTC; presentar America/Bogota en interfaz. La posición incluye instante del dispositivo y de recepción, precisión y secuencia local. Datos sintéticos en los ejemplos.

Viaje: requested → accepted → ready → in_progress → completed. Cancelación desde requested, accepted o ready. La API autoriza cada transición; accepted pasa a ready únicamente con verificación de identidad y detección de vida vigentes. No cancelar ni finalizar offline como si el servidor lo hubiera confirmado. Una verificación periódica fallida durante la marcha registra riesgo y aplica el protocolo, sin pedir acciones distractoras.

Verificación: pending, passed, failed, expired. Los dos resultados, identidad y detección de vida, son necesarios para passed. Una conductora sin autorización administrativa no puede aceptar viajes.

Alerta: created → dispatched → delivered → acknowledged → resolved. dispatched significa aceptada por el canal, delivered exige acuse del cliente y acknowledged una acción explícita de quien atiende. FCM no prueba atención humana.

## Cómo se sincroniza un cambio

1. El cliente envía una operación REST con bearer válido y una clave de idempotencia en las escrituras sensibles.
2. El backend comprueba propiedad o permiso, versión esperada y estado; persiste entidad y evento en una transacción.
3. Responde con la entidad y su versión. Un conflicto produce 409; el cliente actualiza su copia antes de volver a intentar.
4. Publica el evento al canal autorizado del viaje. El administrador solo recibe viajes para los que tiene permiso.
5. La otra interfaz usa el evento para solicitar la entidad actual o actualizar la vista. El servidor sigue siendo la autoridad.

Los contratos REST están en Documentación/Contratos/openapi.json. El sobre común de eventos está en Documentación/Contratos/events.schema.json. Son diseños iniciales y deberán ser validados junto al SRS antes de implementarse.

## Desconexión y recuperación

- Cada evento persistido tiene event_id y sequence creciente por viaje. El cliente conserva el último sequence aplicado y deduplica por event_id.
- El socket envía cambios en vivo; al reconectar, recuperar REST con GET /trips/{trip_id}/events?after_sequence=N. Ordenar y aplicar sin duplicar.
- Si el cursor quedó fuera de retención, la API devuelve 410; obtener la instantánea completa y reiniciar cursor. No inventar continuidad de eventos.
- Exponenciar reintentos con jitter, límite y estados de conexión. Mostrar la hora del último dato y distinguir dato actual, pendiente y desactualizado.
- Posiciones offline: cola local con ID único, instante y precisión, lote máximo 100. Reenviar el mismo lote conserva IDs; el servidor no crea registros duplicados. Un GPS atrasado se guarda como histórico y no dispara una alerta actual.
- Alerta silenciosa sin red: mostrar pendiente de envío y una alternativa de contacto definida en el piloto. Nunca mostrar ayuda enviada sin confirmación.
- Primera API con una instancia: un despachador de salida distribuye notificaciones entre sesiones y consulta nuevas secuencias persistidas. Si se escala a varias instancias, definir broker compartido antes de hacerlo; la memoria de un proceso no basta.

## Reparto del trabajo paralelo

| Equipo móvil | Equipo web | Responsabilidad compartida |
|---|---|---|
| Flutter, GPS, cámara, cola local, sesión y APK | Sesión administrativa, tabla de viajes, mapa, incidencias | Contratos, autenticación, IDs y fechas |
| Simulación inicial con respuestas de contrato | Simulación inicial con las mismas respuestas | Estados y errores de API |
| Recibe y confirma cambios de un viaje | Consulta y atiende alertas autorizadas | Migraciones y pruebas de integración |

La web puede trabajar con fixtures sintéticos desde F1. Cada semana se revisa un cambio compartido y se actualiza el contrato si procede; no esperar a terminar ambas interfaces para integrarlas.

## Prueba de aceptación compartida

En integración, iniciar sesión en móvil y web con roles de prueba. Solicitar y aceptar un viaje, completar la verificación válida y transmitir una posición. Comprobar mismo trip_id, estado y versión en los dos clientes. Cortar la conexión web, producir varios eventos y recuperarlos al volver, sin pérdida ni duplicados. Reenviar un lote móvil dos veces y confirmar una sola inserción por ID. Intentar leer un viaje ajeno y exigir 403 o 404. Crear, entregar y atender una alerta y comprobar cada estado por separado. Repetir tras reiniciar API y trabajador.


## Responsabilidad del backend y cobertura pendiente
Julian y John implementan el backend conjuntamente. Cada historia tiene un implementador y revisión cruzada, dentro de las 30 h semanales por persona. Ningún cliente mantiene cuentas ni viajes alternativos. El contrato inicial contiene 13 operaciones y no cubre aún todos los RF: ver TRAZABILIDAD.md. No se modifica su semántica en esta revisión documental.
