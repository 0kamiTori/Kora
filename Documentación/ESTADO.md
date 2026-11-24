# Estado del proyecto
24/11/2026 · versión 0.5 · CAM-2026-005.

## Base vigente
Fecha tentativa 14/01/2027 y sistema académico completo RF01–RF13. Julian en APK, John en web y ambos en backend; disponibilidad aproximada declarada 30 h por persona a la semana. Presupuesto de referencia del documento principal. Documentación centralizada en esta carpeta. Ver [PLAN_MOVIL.md](PLAN_MOVIL.md), [VISION.md](VISION.md) y [PENDIENTES.md](PENDIENTES.md).

## Avance real
F0 en curso: visión y planificación actualizadas para revisión. No hay evidencia de cierre de fase ni aprobación académica nueva. El avance es documental. No existen proyectos ejecutables Flutter/React/FastAPI, migraciones aplicadas, APK, integración real, biometría evaluada ni despliegue. OpenAPI y eventos son diseños parciales. El verificador solo comprueba coherencia documental y estructura del contrato.

## Próxima tarea verificable
Revisar la visión entre ambos y completar la primera historia del SRS RF01 (registro, consentimiento y roles), con entradas, validaciones, errores, permisos y aceptación. Asignar implementador y revisor del backend. Después verificar SDK, inicializar la base compartida y probar /health desde ambos clientes en F2. No empezar con el reconocimiento facial completo antes de comprobar su viabilidad.

## Evidencias de esta revisión
Los documentos vigentes son Word 01, 02 y 03, Markdown y project-plan.json. Registro CAM-2026-005. Pasó scripts/validate_foundation.py: fechas, capacidad, presupuesto transcrito, trazabilidad, enlaces y estructura de los 13 endpoints iniciales. Cinco casos negativos fueron rechazados: hueco semanal, reserva incorrecta, diferencia presupuestaria omitida, fase cerrada sin evidencia y fecha académica confirmada sin soporte. Se verificaron el archivo histórico y los contratos contra Git, la geometría Word y sus recursos gráficos. Se renderizaron e inspeccionaron las 18 páginas vigentes: visión 9, plan 5, registro 4. Ninguna comprobación documental acredita el producto. La publicación GitHub se verifica por commit y árbol remoto al cierre.
