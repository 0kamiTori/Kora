# Entrega de Köra antes de la segunda semana de diciembre

Versión de planificación 0.4 · CAM-2026-004 · 18/11/2026.

## Información aportada por el usuario

La entrega debe realizarse antes de la segunda semana de diciembre de 2026 para presentar el proyecto y disponer de tiempo para tramitar su aceptación para el año siguiente. El usuario desarrolla móvil y John Ortiz desarrolla web. Ambos disponen de aproximadamente 30 horas semanales por persona, 60 en conjunto, incluidos fines de semana.

Esta información reemplaza las hipótesis anteriores de dos personas sin asignación, 20 horas semanales y entrega en abril de 2027. No se ha confirmado una fecha institucional exacta ni un presupuesto disponible.

## Objetivo interno y capacidad

Se propone el **domingo 06/12/2026** como objetivo interno conservador, antes de la semana del 7 de diciembre. Es una fecha propuesta, no una fecha oficial comunicada por la institución. Se recomienda dejar el paquete candidato listo el 04/12 y reservar los días 5 y 6 para correcciones y entrega.

| Ventana | Móvil | Web | Condición |
|---|---|---|---|
| 18 al 22 de noviembre | 20 h | 20 h | Capacidad parcial conservadora propuesta, por distribuir |
| 23 al 29 de noviembre | 30 h | 30 h | Dedicación aproximada declarada |
| 30 de noviembre al 6 de diciembre | 30 h | 30 h | Dedicación aproximada declarada |
| Total previsto | 80 h | 80 h | 160 h de equipo |
| Reserva incluida del 20 % | 16 h | 16 h | No se suma al total |
| Trabajo programable | 64 h | 64 h | 128 h de equipo |

La disponibilidad semanal está confirmada como aproximación; las 80 horas son un tope de planificación inferido, no horas trabajadas. El horario concreto y los recursos siguen por confirmar. Las tareas de backend se reparten dentro de estas horas, sin agregar una tercera persona ni capacidad adicional.

## Alcance recomendado para la presentación

La base actual todavía no contiene aplicaciones inicializadas. Con esta ventana no se debe prometer el alcance completo de 20 semanas ni considerar validados los objetivos biométricos y de seguridad. Se propone una **primera entrega académica demostrable**, pendiente de acordar con el usuario y el director:

- APK Android y web que acceden a una misma API y base.
- Inicio de sesión y permisos básicos; perfiles de pasajera y conductora con cuentas de prueba.
- Solicitud, aceptación y consulta de estado de un viaje de demostración.
- Mapa y una posición o recorrido de prueba identificados como tales, visibles también en web.
- Creación y consulta de una alerta de demostración, diferenciando creación y atención.
- README, instrucciones de ejecución, requisitos priorizados y evidencias de pruebas realizadas.

No se elimina del proyecto el reconocimiento facial, la detección de vida, la verificación periódica, las anomalías, la recuperación avanzada o el piloto. Su terminación y validación quedan por replanificar. Presentarlos como pendientes cuando no existan evidencias. El uso de datos sintéticos o dobles de prueba debe estar restringido e identificado como demostración; nunca autoriza un viaje real ni aparece como validación biométrica real.

El usuario debe confirmar si esta primera entrega satisface lo exigido. Si se requiere el producto completo validado en diciembre, renegociar alcance, recursos o plazo; el calendario comprimido no acredita factibilidad.

## Secuencia propuesta

| Fecha | Trabajo compartido | Móvil del usuario | Web de John | Cierre verificable |
|---|---|---|---|---|
| 18 y 19/11 | Acordar entrega y prioridades | Definir recorrido mínimo | Definir vistas de presentación | Alcance y responsables revisados |
| 20/11 | Requisitos mínimos y contrato | Modelos y errores de pantalla | Mismos IDs, estados y errores | Contrato mínimo acordado |
| 21 y 22/11 | Entorno y API inicial | Generar Flutter y conectar /health | Generar web y conectar /health | Dos clientes acceden a la misma API |
| 23 al 26/11 | Sesión y viajes | Registro o acceso y flujo básico | Listado y detalle de viaje | Mismo viaje y permisos en ambos |
| 27 al 30/11 | Mapa y actualización | Posición o recorrido de prueba | Visualizar actualización | Origen y antigüedad de datos visibles |
| 01 y 02/12 | Alerta y estados | Crear alerta de prueba | Consultar y atender | Sin atribuir entrega o atención inexistentes |
| 03 y 04/12 | Integración y documentación | APK candidata y prueba física | Web y guía de ejecución | Recorrido reproducible y defectos registrados |
| 05 y 06/12 | Reserva y presentación | Corregir fallos prioritarios | Corregir fallos prioritarios | Paquete entregable con límites explícitos |

Reservar dentro de las 30 h por persona una revisión conjunta de al menos 2 h semanales. Propuesta de reparto: 18 h de interfaz, 6 h de API o integración y 6 h de pruebas y documentación. La reserva global ya está incluida en la capacidad; no programar el 100 % de horas en funciones nuevas.

## Presupuesto sugerido para decidir

**Recomendación: reservar 300.000 COP** para la primera presentación con entorno remoto durante un mes. Son bolsas de planificación, no tarifas oficiales ni dinero aprobado. Servicios compartidos entre móvil y web, contados una sola vez.

| Rubro | Reserva sugerida |
|---|---|
| API compartida durante un mes | 80.000 COP |
| Base administrada y margen de respaldo durante un mes | 70.000 COP |
| Consumo de mapas y rutas de pruebas | 30.000 COP |
| Datos móviles adicionales de pruebas | 40.000 COP |
| Traslados o preparación de la presentación | 30.000 COP |
| Subtotal | 250.000 COP |
| Contingencia 20 % | 50.000 COP |
| **Total sugerido** | **300.000 COP** |

Se asumen computador, teléfonos y conexión básica existentes. No incluye compra de equipos, suscripción Codex o uso de modelos, tasas institucionales, dominio, tiendas, atención permanente ni servicios comerciales biométricos. No se ha contratado ningún servicio ni aprobado gasto. La fecha de vencimiento de una suscripción y su cancelación deben controlarse para no convertir un mes presupuestado en un cargo recurrente no previsto.

**Alternativa local: 120.000 COP**, con API, base y web en un equipo existente y pruebas en red local: mapas 30.000, datos 40.000, presentación 30.000 y reserva 20.000. No incluye alojamiento remoto ni permite prometer acceso externo permanente; exige probar la conectividad en el lugar de presentación.

**Ampliación biométrica opcional: 780.000 COP en total**, si se agregan provisiones de 100.000 para cómputo separado y 300.000 para evaluación de detección de vida al subtotal base, más 20 % de contingencia. Esta reserva no es cotización y no garantiza proveedor, precisión o integración dentro del plazo; requiere ensayo, licencia y decisión antes de gastar.

El presupuesto de desarrollo completo y el piloto posterior siguen sin cuantificar para el nuevo escenario. Los 1.705.000 COP anteriores corresponden al plan de 20 semanas y se conservan como antecedente, no como presupuesto de esta entrega.

Si se desea valorar el trabajo aportado, conservando únicamente como referencia la tarifa propuesta de 20.000 COP/h: 80 h móviles son 1.600.000 COP y 80 h web otros 1.600.000 COP. Trabajo de equipo más operación base suma 3.450.000 COP; con 20 % de reserva financiera serían 4.140.000 COP. Esta valoración no es desembolso ni salario acordado. No sumar de nuevo el total operativo, ya incluido.

## Fuentes y límites de la estimación

Fuentes oficiales consultadas el 18/11/2026: [Render precios](https://render.com/pricing), [límites gratuitos de Render](https://render.com/docs/free), [precios de Google Maps](https://developers.google.com/maps/billing-and-pricing/pricing) y [FCM](https://firebase.google.com/products/cloud-messaging).

Los precios finales dependen de plan, moneda de cobro, impuestos y consumo. Las reservas COP no son conversiones de una TRM verificada. El nivel gratuito de Render tiene suspensión por inactividad y su base gratuita expira; no se usa como garantía de continuidad. FCM no cobra por su servicio de mensajería, pero no reemplaza API, base ni pruebas de entrega.

## Acuerdos aún necesarios

Confirmar día institucional exacto y si se exige primera entrega o producto completo; aceptar o ajustar el alcance de presentación; decidir presupuesto local de 120.000, remoto de 300.000 u otra cifra; inventariar herramientas y equipos; repartir el backend entre ambos. Los demás pendientes de privacidad, biometría y piloto permanecen para su momento, antes de usar datos reales.
