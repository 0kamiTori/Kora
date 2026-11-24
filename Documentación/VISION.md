# Documento visión de Köra

Versión 0.5 · 24/11/2026 · CAM-2026-005

Köra integrará una aplicación Android para pasajeras y conductoras, una web administrativa y un backend común. Esta visión define el sistema académico completo, sus límites y la evidencia necesaria para aceptarlo. La fecha de entrega indicada por el usuario es tentativa: 14 de enero de 2027. El avance actual es documental; no existe una aplicación ejecutable.

## 1 Problema y propósito

La propuesta identifica riesgos de suplantación de conductoras, desviaciones de ruta y falta de información y alertas oportunas. Köra busca verificar identidad, observar anomalías del trayecto y facilitar el seguimiento de su atención. La reducción de incidentes es una hipótesis; una evaluación controlada no demuestra por sí sola una disminución de violencia.

## 2 Objetivo y resultados

Desarrollar la plataforma de movilidad segura para mujeres prevista en la propuesta, integrando verificación biométrica de la conductora y análisis de desviaciones en tiempo real. Los resultados cubren arquitectura y requisitos, identidad con detección de vida, análisis de rutas, interfaces y evaluación funcional y de percepción de seguridad.

## 3 Personas y responsabilidades

| Perfil | Necesidad y responsabilidad |
| --- | --- |
| Pasajera | Solicita el viaje, consulta identidad y ruta, comparte un enlace y activa ayuda. |
| Conductora | Acredita identidad, obtiene aprobación, acepta viajes y transmite ubicación. |
| Administración | Aprueba conductoras, consulta viajes autorizados y registra atención de incidencias. |
| Contacto de confianza | Consulta solo el viaje y los datos permitidos mediante enlace temporal revocable. |
| Autores y director | Autores implementan y revisan; director revisa entregables académicos según disponibilidad por acordar. |

## 4 Alcance del producto completo

Incluye RF01 a RF13: cuentas, consentimiento, aprobación de conductoras, ciclo de viaje, identidad facial y detección de vida, verificación segura, GPS y rutas, índice de anomalías explicable, alertas, enlace de seguimiento, administración y ciclo de datos. La APK y la web operan sobre cuentas, viajes y eventos comunes. La web de esta línea base es administrativa; ampliar a reserva pública exige registrar el cambio.

Quedan fuera pagos reales, tarifas dinámicas, despacho masivo, operación comercial abierta, iOS, publicación en tiendas e integración directa con autoridades. Completo significa terminar y evaluar el alcance académico definido, no habilitar esos servicios. Abrir un canal de ayuda no implica despacho automático de emergencia ni atención permanente.

## 5 Flujo y reglas críticas

Registro y consentimiento → revisión de conductora → solicitud y aceptación → ruta prevista → identidad y vida aprobadas → inicio → seguimiento y anomalías → alertas y atención cuando correspondan → finalización e historial.

Estados de viaje: requested, accepted, ready, in_progress y completed; cancelación desde requested, accepted o ready. Solo backend autoriza transiciones. La aprobación administrativa y una verificación real vigente son requisitos de inicio. No operar un viaje con verificaciones simuladas ni marcarlo iniciado offline sin confirmación.

Estados de alerta: created, dispatched, delivered, acknowledged y resolved. Cada avance requiere evidencia; FCM aceptado no prueba entrega ni atención humana. Una ubicación atrasada no se presenta como actual ni genera una alarma actual sin regla justificada.

## 6 Reparto del desarrollo

Julian Hernando Perez Villamizar desarrolla Android; John Eduardo Ortiz Castellanos desarrolla web; ambos implementan backend, contratos, migraciones y pruebas de integración. Cada historia compartida tiene implementador y revisor. Las aproximadamente 30 h semanales por persona incluyen backend, pruebas y documentación; no se contabilizan de nuevo.

## 7 Requisitos funcionales de identidad y viaje

Todos los RF pertenecen al alcance completo. Los siguientes criterios son mínimos para detallar historias en F1; no sustituyen el SRS con campos, errores y pruebas. Todos están pendientes de implementación.

## RF01 Cuentas consentimiento y roles

Registrar cuenta y consentimiento versionado; iniciar y cerrar sesión, renovar o revocar acceso. Contraseñas protegidas. No otorgar administración desde el cliente.

CA01: alta válida y duplicada, rechazo de consentimiento ausente y de acceso por rol indebido; revocación efectiva.

## RF02 Aprobación de conductoras

Revisar documentación y referencia de identidad; aprobar, rechazar o suspender con motivo auditable. La captura no equivale a aprobación.

CA02: pendiente, rechazada o suspendida no acepta viajes; solo administración autorizada cambia aprobación.

## RF03 Ciclo de viaje

Solicitar, aceptar, preparar, iniciar, cancelar donde corresponda y finalizar. Validar versión, propiedad, concurrencia y transiciones en backend.

CA03: un viaje conserva el mismo ID en APK y web; repetir operación no duplica; transición inválida o ajena es rechazada.

## RF04 Identidad y detección de vida

Comparar rostro uno a uno contra referencia aprobada y comprobar presencia real antes de iniciar. Resultado con modelo, umbral, fecha, vencimiento y vínculo a conductora y viaje.

CA04: identidad y vida vigentes permiten ready; fallo, vencimiento, indisponibilidad o intento de reproducción impiden autorizar el inicio.

## RF05 Verificación periódica segura

Aplicar política de vigencia y nuevas verificaciones únicamente con el vehículo detenido o mediante mecanismo pasivo validado. Durante la marcha no exigir gestos, cámara manual ni pulsaciones.

CA05: desafío interactivo no aparece en movimiento; diferido, vencido o fallido queda visible y aplica protocolo, sin marcar identidad confirmada.

## 8 Requisitos de seguimiento y atención

## RF06 Ruta de referencia

Calcular y persistir ruta prevista con origen, destino, proveedor y versión. Cambios autorizados registran actor, motivo y hora.

CA06: móvil y web usan la misma versión; un cambio no autorizado no borra una desviación ni reescribe el historial.

## RF07 Ubicación y detección

Capturar posiciones con precisión y tiempos de dispositivo y recepción; tratar pérdida de señal, paradas y desvíos con persistencia temporal.

CA07: cola sin red recupera sin duplicados; posición atrasada queda histórica; imprecisión y señal perdida no aparentan ubicación actual.

## RF08 Índice explicable de anomalías

Combinar factores de desviación, parada y verificación según reglas versionadas. Mostrar causas y nivel operativo; no asignar probabilidad de delito.

CA08: entradas conocidas reproducen nivel y factores; calibración separada de evaluación; no ocultar datos insuficientes.

## RF09 Alertas y atención

Crear alertas automáticas y silenciosas; persistir causas, destinatarios, reintentos, entrega, atención y resolución. Definir alternativa de contacto sin red.

CA09: una alerta sin red figura pendiente; reintento no duplica; created, dispatched, delivered, acknowledged y resolved requieren evidencia distinta.

## RF10 Seguimiento compartido

Generar enlace opaco limitado al viaje, con vencimiento y revocación. Exponer solo datos necesarios, sin rostro ni historial completo.

CA10: enlace vencido, revocado o de otro viaje es rechazado; limitar intentos y registrar accesos conforme a política.

## 9 Información administración y ciclo de datos

## RF11 Información en las interfaces

Mostrar estado del viaje, mapa, antigüedad del último dato, conectividad, resultado y vigencia de verificación con estados de carga y error.

CA11: ambos clientes muestran IDs y versiones coherentes; tras desconexión recuperan eventos y señalan datos desactualizados.

## RF12 Administración y auditoría

Gestionar incidencias y parámetros con permisos mínimos; conservar actor, acción, versión y fecha. Evitar acceso administrativo indiscriminado a rostros y rutas históricas.

CA12: toda acción sensible es trazable; una operadora sin permiso no consulta ni cambia el recurso.

## RF13 Derechos y ciclo de datos

Recibir solicitudes de consulta, retiro y eliminación; ejecutar política aprobada, incluyendo datos derivados y tratamiento de copias de seguridad.

CA13: solicitud autenticada queda trazable; revocar acceso y eliminar o retener justificadamente cada dato; comunicar resultado según política.

## 10 Datos esenciales

Cuenta y consentimiento conservan rol, estado y versión aceptada. Conductora y referencia biométrica relacionan aprobación y plantilla cifrada. Viaje y ruta mantienen partes, estado y revisiones; posiciones incluyen ID único, precisión y tiempos. Verificaciones guardan resultado, modelo, umbral, política, fecha y vencimiento. Alertas y eventos conservan secuencia, entrega y atención; enlaces opacos tienen expiración y revocación.

La política debe definir finalidad, responsable, retención por tipo de dato, acceso, retiro y borrado, incluidas copias. No inferir género del rostro. No incluir rostros, ubicaciones reales, claves ni firmas en repositorio o evidencias públicas. Datos reales y piloto requieren consentimiento y revisiones institucionales que correspondan; aún no están acreditadas.

## 11 Calidad y evaluación

Estas cifras son metas propuestas para revisar antes de evaluar, no resultados ni garantías. Registrar versión, dispositivos, red, tamaño de muestra, esperado, observado y limitaciones. Si una meta no se alcanza, documentar defecto y decisión; no marcarla cumplida por ausencia de mediciones.

| ID | Área | Criterio y evidencia |
| --- | --- | --- |
| RNF01 | Autorización y seguridad | Cero accesos ajenos exitosos en batería de roles y recursos; TLS fuera de local, hash robusto, secretos fuera de Git y pruebas de tokens revocados. |
| RNF02 | Privacidad | Consentimiento previo a captura; cifrado y acceso mínimo a datos sensibles; probar vencimiento de enlaces y procedimiento de eliminación. |
| RNF03 | Latencia | Meta p95 recepción GPS → evento persistido ≤ 5 s con red; medir aparte entrega al cliente. Declarar equipo, concurrencia, red y número de muestras. |
| RNF04 | Conectividad | Meta: marcar posición desactualizada al superar 30 s desde el último dato válido con reloj coherente. Recuperar cola y eventos sin duplicados tras corte y reinicio. |
| RNF05 | Usabilidad | Meta de éxito ≥ 90 % en tareas críticas del protocolo. Informar participantes, tareas, errores y condiciones; evaluar percepción de seguridad sin inferir reducción de incidentes. |
| RNF06 | Biometría | Metas experimentales FAR ≤ 1 % y FRR ≤ 5 %. Reportar conteos, intervalos de confianza y condiciones; probar detección de vida por separado y no certificar tasas con muestras insuficientes. |
| RNF07 | Anomalías de ruta | Metas sensibilidad ≥ 90 % y viajes normales con falsa alerta ≤ 10 %. Definir verdad de referencia y denominadores; separar calibración y evaluación. |
| RNF08 | Reproducción y recuperación | Otro integrante instala desde versiones y locks, migra una base limpia, restaura respaldo y ejecuta guion integral sin secretos en repositorio. |

FAR = aceptaciones impostoras / intentos impostores; FRR = rechazos genuinos / intentos genuinos. La detección de vida debe evaluar personas presentes, fotos y reproducción de vídeo por separado. La sensibilidad de ruta usa anomalías detectadas / anomalías reales; la falsa alerta usa viajes normales alertados / viajes normales. Acordar protocolo y muestras antes de medir.

## 12 Tecnología e infraestructura

| Componente | Base tecnológica | Uso y condición |
| --- | --- | --- |
| APK Android | Flutter y Dart; Riverpod y go_router | Capas de interfaz y datos, estado y rutas fuera de widgets. |
| Servicios móviles | Dio, almacenamiento seguro, Drift/SQLite, geolocator y camera | Sesión, cola offline, GPS y cámara; servicio Android de ubicación y permisos verificables. |
| Mapas y avisos | Google Maps/Routes y FCM | Rutas y mapas; avisos complementarios a eventos persistidos. |
| Web | React, TypeScript y Vite | Portal administrativo con permisos y API comunes. |
| API | Python, FastAPI, Uvicorn y Pydantic | Reglas del negocio y autorización en servidor; REST /api/v1 y WSS. |
| Datos | PostgreSQL/PostGIS, SQLAlchemy y Alembic | Una fuente de verdad, migraciones y consultas geográficas. |
| Biometría | OpenCV con YuNet/SFace como candidatos; vida por seleccionar | Trabajador aislado; elección tras ensayo, licencia y evaluación. |
| Entrega | Docker y GitHub Actions; Render recomendado | Entornos separados; locks y versiones exactas en F2, sin servicios contratados. |

Arquitectura inicial: backend modular, una base y trabajador biométrico aislado. Los cambios y eventos se persisten en la misma transacción; bandeja de salida para reintentos. REST confirma operaciones y recupera eventos; WebSocket distribuye cambios. El socket y la memoria de proceso no son almacenamiento.

Local: API y PostgreSQL/PostGIS con datos sintéticos. Integración y piloto: Render como recomendación, API activa, trabajador, base administrada y web estática; misma región y red privada cuando aplique, TLS y secretos por entorno. Dimensionar tras medir, comprobar cuotas y ensayar respaldo y restauración antes de datos reales. No existe infraestructura desplegada.

## 13 Plan y presupuesto de referencia

Inicio de planificación actualizado: 24/11/2026. Entrega tentativa: 14/01/2027, sin evidencia de fecha institucional confirmada. F0 bases; F1 requisitos; F2 base y viabilidad; F3 identidad y viajes; F4 ubicación y anomalías; F5 alertas e integración; F6 evaluación; F7 entrega. El detalle está en el plan y project-plan.json.

Capacidad propuesta: 220 h por persona, 176 programadas y 44 de reserva, 440 h de equipo en total. Las ventanas parciales se estiman en 25 y 15 h, más seis semanas de 30 h. No se han confirmado ausencias. El esfuerzo por historias y la viabilidad del alcance deben revisarse en F1 y F2; este calendario no garantiza la entrega.

Se adopta como referencia el presupuesto del documento principal, propuesta 65-2026-185, páginas 19–21: subtotal declarado 30.350.544 COP, imprevistos 3.035.054 COP y total 33.385.598 COP. Los rubros visibles suman 30.370.544 COP; la diferencia de 20.000 COP queda pendiente de conciliación. No se modifica silenciosamente la fuente ni se acredita financiación recibida. Detalle en PRESUPUESTO.md.

## 14 Riesgos y puertas de decisión

| Riesgo | Tratamiento y momento de revisión |
| --- | --- |
| Calendario exigente | Estimar historias en F1; si exceden capacidad, proponer ajuste de recursos o fecha mediante control de cambios. |
| Identidad o vida no viables | Ensayo y licencia en F2 antes de aceptar RF04; fallar de forma segura sin simular autorización. |
| GPS y distracción | Pruebas físicas de señal, permisos y batería; verificaciones interactivas solo detenida. |
| Datos y alertas sin atención | Definir tratamiento, consentimiento, destinatarios y horarios antes de participantes reales. |
| Costos y dependencia externa | Medir cómputo, revisar cuotas y cobertura, planificar indisponibilidad antes de contratar. |

## 15 Entrega y aceptación del sistema

Entregar código versionado y locks; APK firmada instalable y firma custodiada fuera de Git; web y API en entorno accesible o reproducible acordado; migraciones y configuración sin secretos; matriz RF/RNF con resultados; informes de biometría, rutas y evaluación; manuales de uso, operación, despliegue y recuperación; registro de cambios y defectos.

El guion integral debe cubrir registro y aprobación, viaje con identidad y vida reales, ruta y posiciones, anomalía y alerta, atención web, enlace revocable, reconexión, finalización y tratamiento de datos. Probar recursos ajenos y roles inválidos. Otro integrante reproduce instalación y restauración. No cerrar con defectos críticos de seguridad o integridad abiertos; evidenciar qué metas se alcanzaron y cuáles no.

OE1 se evidencia con requisitos, contratos y arquitectura; OE2 con verificación y evaluación biométrica; OE3 con GPS, anomalías y métricas; OE4 con APK y web funcionales; OE5 con pruebas integradas y evaluación controlada. La matriz TRAZABILIDAD.md relaciona RF, fases y casos de aceptación. Hoy todas las funciones figuran no implementadas.

## 16 Documentación y control de cambios

Documentación es la carpeta canónica en GitHub para visión, planificación, requisitos, contratos, decisiones y Word. Historial conserva versiones anteriores sin vigencia. Cada cambio registra ID, motivo, impacto, implementador, revisor, archivos, evidencia y reversión; actualiza CHANGELOG, ESTADO y el Word 03. Un cambio incompatible de API exige versión y migración. Una regresión puede reabrir una fase.

## 17 Fuentes y estado de revisión

Fuente principal: propuesta 65-2026-185 aportada por el usuario, objetivos, resultados, actividades, presupuesto y ética. Acuerdos posteriores del usuario: entrega tentativa, sistema completo, responsables, dedicación, presupuesto de referencia y carpeta Documentación. Esta revisión 0.5 está preparada para revisión de los autores; no atribuye aprobación académica.

Fuentes técnicas oficiales: docs.flutter.dev/app-architecture/recommendations; render.com/docs/postgresql-extensions; render.com/docs/websocket; developer.android.com/develop/background-work/services/fgs/service-types. Consultadas el 24/11/2026. Detalle y enlaces en ARQUITECTURA.md. Decisiones pendientes en PENDIENTES.md.
