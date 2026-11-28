# Plan del sistema completo Köra
Versión 0.7 · 24/11/2026 · CAM-2026-005. Esta versión sustituye los escenarios anteriores. Fecha tentativa de entrega: **14/01/2027**. El alcance es el sistema académico completo definido en [VISION.md](VISION.md), con Android, web administrativa y backend compartido; no una demostración con verificaciones simuladas.

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

## Preparación móvil APP01

Se adelanta la base Android y la apariencia local, independientes de la identidad y los viajes. La implementación no acredita cierre de fase. Estado, versiones y comandos en [MOVIL_APARIENCIA.md](MOVIL_APARIENCIA.md). Se mantienen fechas, horas y presupuesto de referencia.

## Entregas acordadas el 26 de noviembre

CAM-2026-008. La primera entrega oficial será un avance de registro y aprobación; la segunda incorporará desarrollo e integración biométrica. No son dos fases cerradas ni tienen fechas independientes confirmadas. Se conservan las fechas y horas propuestas de F0–F7 como referencia que debe reestimarse, sin asumir que este orden acredita su cumplimiento. No se habilitan viajes operativos antes de los controles reales.

Orden inmediato: cerrar pendientes de [RF01](RF01_REGISTRO.md), completar contrato, asignar implementador y revisor backend, preparar API y persistencia compartidas, implementar registro verificable y después solicitud y panel de revisión. Probar fallos y permisos antes de aceptar cada historia. El alcance final, presupuesto y objetivo tentativo del 14/01/2027 permanecen; estimar el avance y la segunda entrega antes de comprometer fechas.

## Preparación de pantallas APP02

CAM-2026-009. Implementada interfaz móvil premium de registro y revisión, con pruebas locales; el siguiente trabajo es contrato y API compartida, no otra base de identidad local. Dos apelaciones y nueva solicitud tras 30 días de rechazo definitivo requieren persistencia en servidor. Documentos y biometría siguen aplazados según lo acordado. No se cierran fases ni se reestiman aquí fechas u horas.

## Primer paso de funcionalidad RF01

CAM-2026-010. Contrato v2 de política y registro preparado y verificado por esquemas; no es alta funcional. Revisar entre autores y avanzar a API/migraciones/pruebas sintéticas compartidas. Mantener deshabilitado el registro real sin consentimiento aprobado y responsable identificado. El reporte físico de APP02 añade PERF01 para diagnóstico, sin reestimar aquí fechas u horas. Se conserva la biometría en segunda entrega y el control de fases por evidencia.

## Preparación compartida API01

CAM-2026-011 inicializa base API y migración como historia independiente del alta funcional. Criterio: estado preparado solo con PostGIS y revisión correcta, migración verificable sobre una base vacía y registro cerrado. Localmente falta servidor; CI debe aportar la evidencia de persistencia. Implementación asistida para Julian y revisión de John pendiente. No se alteran fechas, horas o presupuesto ni se declara F2 terminada.

## Integración móvil APP03

27/11/2026 · APP03 · CAM-2026-014. Android 0.3.0+3 conecta política y alta v2 mediante Dio 5.11.1, con consentimiento explícito del servidor, errores saneados, doble pulsación controlada y envío incierto conservado solo en memoria para reintentar con igual clave. Cuenta creada únicamente tras 201 válido. Se conserva premium/color y no se concede sesión o aprobación de conductora. Configuración y preparador local separan kora_test_mobile de Neon y requieren los controles sintéticos de API02; sin cambios al contrato o esquema. Guía INTEGRACION_MOVIL.md. Pruebas locales: 33 Flutter aprobadas y dos capturas omitidas; backend 57 aprobadas y 32 PostgreSQL omitidas. CI de HTTP real, backend y APK pendiente. No hay prueba física nueva o cierre de fase. Implementación asistida para Julian; revisión de John pendiente. Word candidatos sujetos a render; PERF01, consentimiento real y entrega de incidentes siguen pendientes.
