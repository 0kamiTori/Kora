# Plan móvil de Köra

**Actualización vigente del 18/11/2026, CAM-2026-004:** el usuario requiere entregar antes de la segunda semana de diciembre. Móvil: usuario; web: John Ortiz; aproximadamente 30 h semanales por persona. El [plan de entrega de diciembre](ENTREGA_DICIEMBRE.md) reemplaza las fechas y capacidad del escenario siguiente. Objetivo interno propuesto: 06/12/2026. Alcance de presentación y presupuesto sugerido aún por acordar. El escenario de 20 semanas que sigue se conserva como antecedente, no como compromiso vigente.

Versión 0.2 · 18 de noviembre de 2026 · Escenario de planificación para revisión.

El entregable principal es Android con perfiles de pasajera y conductora. La web administrativa se desarrolla en paralelo con el mismo backend. El alcance incluye registro, consentimiento, aprobación de conductoras, viajes, identidad y detección de vida, mapa y GPS, anomalías, alertas e historial. Pagos, iOS, tiendas y operación comercial quedan fuera del MVP.

## Fechas y capacidad

Inicio técnico propuesto **23/11/2026** y entrega **11/04/2027**, 20 semanas. Este calendario reemplaza la estimación previa de 22 semanas para la planificación técnica, pero **no confirma ni amplía el plazo académico**. Validar la fecha de notificación y vencimiento con el director: si es anterior, ajustar alcance o capacidad antes de comprometer este calendario.

Dedicación supuesta: 20 h/semana móvil y 20 h/semana web, por dos responsables distintos. Horario sugerido por persona: lunes a viernes 19:00–22:00 y sábado 08:00–13:00, America/Bogota. No es disponibilidad declarada por los integrantes. Las semanas del 21/12/2026 al 03/01/2027 se reducen a 10 h por persona; vacaciones adicionales obligan a recalcular.

Capacidad móvil: **380 h**; se asignan **304 h** a trabajo previsto y **76 h** a correcciones e imprevistos. La reserva de 20 % ya está incluida. La web dispone del mismo escenario de capacidad. Si solo una persona hace las dos interfaces, no se mantiene el calendario ni se suman horas ficticias.

## Perfiles de trabajo

| Perfil | Dedicación normal | Distribución propuesta |
|---|---|---|
| Móvil | 20 h/sem | 12 Flutter, 5 backend compartido, 3 pruebas y documentación |
| Web paralelo | 20 h/sem | 12 React, 5 backend compartido, 3 pruebas e integración |
| Director o asesor | 1 h/sem por confirmar | Revisión de entregables; fuera de valoración móvil |
| Supervisión del piloto | Durante sesiones | Atención designada; sin vigilancia permanente asumida |

Perfiles del producto: pasajera, conductora, administración y contacto de confianza. La conductora necesita aprobación administrativa; el contacto solo accede mediante enlace limitado. Una cuenta no obtiene permisos administrativos por seleccionar una pantalla. Asignación nominal del trabajo: pendiente.

## Fases y cierre

| Fase | Fechas | Entregable | Condición de cierre |
|---|---|---|---|
| F0 Bases y coordinación | 23/11/2026 a 29/11/2026 | Visión móvil y responsables | Revisar fecha oficial, dedicación y dependencias. |
| F1 Requisitos y contratos | 30/11/2026 a 13/12/2026 | SRS y contrato compartido | RF01 a RF13 con aceptación y errores acordados. |
| F2 Diseño y viabilidad | 14/12/2026 a 03/01/2027 | Proyectos base, DB, ensayos GPS y biometría | Dos clientes acceden a API; candidatos viables. |
| F3 Identidad y viajes | 04/01/2027 a 31/01/2027 | Cuentas, roles, conductoras y verificaciones | Permisos y pruebas genuinas, impostoras y ataques aceptados. |
| F4 GPS y rutas | 01/02/2027 a 28/02/2027 | Mapa, seguimiento, cola local y anomalías | Desconexión, duplicados, precisión y pantalla apagada probados. |
| F5 Integración y alertas | 01/03/2027 a 21/03/2027 | Eventos persistidos, web y FCM | Recuperación tras reconexión y reinicio pasa sin duplicar. |
| F6 Piloto y ajustes | 22/03/2027 a 04/04/2027 | Piloto y métricas | Protocolo autorizado; sin defectos críticos abiertos. |
| F7 Entrega y reproducción | 05/04/2027 a 11/04/2027 | APK, manuales y documentación | Instalación reproducida y respaldo restaurado. |

La web trabaja con fixtures de contrato desde F1 y participa en cada entrega semanal. No esperar a terminar ambas interfaces para integrarlas. Pruebas, cambios y documentación son permanentes. Si una evidencia falla, corregir o reabrir la fase.

## Presupuesto móvil e infraestructura compartida

Montos estimados en COP. Son bolsas de planificación, no cotizaciones, no salarios comprometidos ni autorización de contratación. Equipos y conectividad básica existentes; inventario por confirmar. Infraestructura reservada para tres mensualidades de integración y piloto, aproximadamente desde F3; activar tarde o superar ese tiempo cambia el cálculo.

| Rubro | Cantidad | Valor unitario | Total |
|---|---|---|---|
| Infraestructura compartida API trabajador base respaldo y egreso | 3 mes | 250.000 COP | 750.000 COP |
| Mapas y rutas | 3 mes | 50.000 COP | 150.000 COP |
| Reserva para detección de vida o licencia de evaluación | 1 reserva | 300.000 COP | 300.000 COP |
| Datos móviles adicionales | 5 mes | 30.000 COP | 150.000 COP |
| Logística de piloto | 1 piloto | 200.000 COP | 200.000 COP |
| Subtotal operativo | | | 1.550.000 COP |
| Reserva operativa 10 % | | | 155.000 COP |
| Desembolso previsto | | | **1.705.000 COP** |

Valoración de trabajo móvil: 380 h × 20.000 COP/h = **7.600.000 COP**; incluye la contribución móvil al backend y la reserva de tiempo. No significa un pago adicional si los autores aportan trabajo. Base operación + trabajo: 9.150.000 COP; contingencia 10 %: 915.000 COP; total económico: **10.065.000 COP**. Este total ya incluye operación y su reserva: no sumarle de nuevo el desembolso de 1.705.000 COP.

La mano de obra web queda fuera: 380 h adicionales, valoradas de referencia en 7.600.000 COP antes de reserva. API, base, mapas e infraestructura se cuentan una sola vez. No asumir recursos institucionales o financiación confirmados.

Exclusiones: compra de equipos, suscripción Codex o consumo de modelos, tienda móvil, dominio, iOS, operación comercial y atención permanente. Si el proveedor de detección de vida supera 300.000 COP o el alojamiento supera 250.000 COP/mes, revisar costo o solución antes de continuar; no usar un mecanismo ineficaz para cumplir el presupuesto.

## Acuerdos técnicos e integración

Flutter y Dart para Android; React y TypeScript para web; Python y FastAPI; PostgreSQL con PostGIS. API REST versionada, WebSocket con recuperación de eventos y FCM complementario. Infraestructura recomendada: Render con servicio API siempre activo, trabajador biométrico, DB administrada y web estática. Detalle en [arquitectura](ARQUITECTURA.md) y [sincronización](SINCRONIZACION.md). No se han contratado ni desplegado servicios.

## Pendientes antes de comprometer fechas o usar datos reales

Confirmar plazo académico y dedicación, responsables nominales y financiación. Completar SRS y criterios cuantitativos, resolver detección de vida con prueba de viabilidad, responsable del tratamiento, consentimiento y retención, destinatarios y atención de alertas, participantes y autorización del piloto. Esos acuerdos no bloquean redactar requisitos o crear prototipos con datos sintéticos.

La planificación estructurada está en [project-plan.json](project-plan.json). El anexo Word 04 presenta el mismo escenario; los Word anteriores conservan sus requisitos y registran esta actualización. Las instrucciones de desarrollo están en [GUIA_CODEX.md](GUIA_CODEX.md).
