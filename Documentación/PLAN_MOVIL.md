# Plan del sistema completo Köra
Versión 0.5 · 24/11/2026 · CAM-2026-005. Esta versión sustituye los escenarios anteriores. Fecha tentativa de entrega: **14/01/2027**. El alcance es el sistema académico completo definido en [VISION.md](VISION.md), con Android, web administrativa y backend compartido; no una demostración con verificaciones simuladas.

## Responsables y disponibilidad
Julian Hernando Perez Villamizar desarrolla la APK; John Eduardo Ortiz Castellanos desarrolla la web. Ambos desarrollan y revisan el backend: contratos, identidad, viajes, datos, biometría, rutas, eventos, seguridad y despliegue. Para cada historia asignarán un implementador y un revisor antes de editar servicios compartidos; esa asignación no crea un tercer puesto ni duplica horas.

Disponibilidad aproximada declarada: 30 h semanales por persona, incluidos fines de semana. No se ha fijado un horario diario. Se propone distribuir cada semana normal en 16 h de interfaz, 8 h de backend y 6 h de pruebas, integración y documentación, dentro de esas 30 h. La reserva se extrae de la capacidad total, no se suma a esta distribución.

Del 24/11/2026 al 14/01/2027 se estiman 25 h por persona en la primera ventana parcial, seis semanas de 30 h y 15 h en la última: **220 h por persona, 440 h de equipo**. Planificar 176 h por persona y conservar 44 h de reserva (20 %). Las ventanas parciales son propuestas conservadoras, no disponibilidad adicional confirmada. Revisar ausencias y festivos cada semana. No presupone trabajo ya realizado.

## Fases propuestas y condiciones para avanzar
| Fase | Trabajo | Fechas | Horas previstas por persona | Condición de cierre |
|---|---|---|---:|---|
| F0 | Bases y revisión | 2026-11-24 a 2026-11-25 | 8 | Revisar alcance, roles, pendientes y criterios; registrar observaciones. |
| F1 | Requisitos y contratos | 2026-11-26 a 2026-11-29 | 16 | Flujos normales y de error, reglas y aceptación revisados por ambos; contratos suficientes para la primera historia. |
| F2 | Base técnica y viabilidad | 2026-11-30 a 2026-12-06 | 24 | Ambos clientes acceden a la misma API; decisiones de viabilidad y licencias con evidencia; replanificar si fallan. |
| F3 | Identidad y ciclo de viaje | 2026-12-07 a 2026-12-16 | 40 | Permisos por recurso; ninguna transición a ready sin identidad y detección de vida vigentes; pruebas de errores y ataques. |
| F4 | Ubicación rutas y anomalías | 2026-12-17 a 2026-12-27 | 40 | Pruebas de precisión, desconexión, duplicados, pantalla apagada y verificación segura durante paradas. |
| F5 | Alertas y sincronización integral | 2026-12-28 a 2027-01-03 | 24 | Recuperación REST tras corte; permisos, enlace revocable y acuses; FCM no equivale a atención. |
| F6 | Validación y correcciones | 2027-01-04 a 2027-01-10 | 16 | Protocolo autorizado antes de datos reales; métricas y limitaciones registradas; defectos críticos cerrados. |
| F7 | Entrega reproducible | 2027-01-11 a 2027-01-14 | 8 | Instalación por el otro integrante, restauración y matriz completa de evidencias; acta de revisión, sin inventar aprobación académica. |

No cerrar una fase por llegar a su fecha. Adjuntar evidencia, revisar entre ambos, corregir fallos y actualizar ESTADO. Las pruebas y documentación acompañan cada historia; la web se integra desde F2. Puede prepararse trabajo independiente posterior, pero una función dependiente no se acepta sin superar su puerta previa. Una regresión reabre la fase afectada.

## Viabilidad del calendario
La ventana es exigente para dos personas y el alcance no está implementado. La suma de horas representa capacidad, no una estimación validada de todos los requisitos. En F1 descomponer historias y estimarlas; en F2 medir GPS, biometría y compatibilidad. Si el esfuerzo supera 352 h programables del equipo o falla una dependencia, registrar la desviación y proponer recursos o fecha. No recortar silenciosamente RF ni sustituir controles de seguridad por simulaciones. No hay garantía de finalización el 14/01.

## Presupuesto y tecnología
El [presupuesto de referencia](PRESUPUESTO.md) procede del documento principal. No se adoptan presupuestos alternativos de las versiones históricas. Las tecnologías e infraestructura están en [ARQUITECTURA.md](ARQUITECTURA.md); los contratos y recuperación entre clientes en [SINCRONIZACION.md](SINCRONIZACION.md). Las versiones exactas y licencias se fijan y verifican al crear las aplicaciones. No hay servicios contratados.

## Primera tarea
Completar en F1 el SRS por historias y la [matriz de aceptación](TRAZABILIDAD.md). La primera historia a detallar es registro con consentimiento y acceso por rol (RF01); antes de implementarla verificar herramientas y base compartida de F2. Ver [GUIA_CODEX.md](GUIA_CODEX.md).
