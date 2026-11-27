# Prueba de la APK de registro reportada por el usuario

26/11/2026 · CAM-2026-010. Fuente: declaración del usuario en el diálogo, no ejecución instrumentada del asistente.

El usuario indica que revisó la funcionalidad de los diseños de la APK nueva y quedó bien. El dispositivo de referencia comunicado es Xiaomi Redmi Note 15 Pro con Android 16. Se registra aceptación general de las pantallas APP02, sin atribuir comprobaciones específicas que no se hayan descrito.

También informa que la aplicación va un poco a tirones. Se registra como incidencia PERF01 pendiente de diagnóstico; no se asume que terminar las funciones la corrija. No hay trazas de cuadros, frecuencia de pantalla medida, tiempos, pasos exactos ni causa identificada. No se declara que cumpla o incumpla una meta cuantitativa de rendimiento.

## Comprobación pendiente

Reproducir los tirones en el teléfono con una compilación profile, identificar pantalla y acción, registrar tiempos de cuadros de UI y raster y comparar con el presupuesto por cuadro según frecuencia de pantalla. Corregir la causa observada y repetir el recorrido. La APK debug actual no permite inferir el rendimiento final de distribución.

Flutter recomienda medir rendimiento en un dispositivo físico con modo profile; el modo debug puede añadir pausas y no representa por sí solo la versión final. Esto es una explicación posible, no un diagnóstico del caso. [Guía oficial](https://docs.flutter.dev/perf/ui-performance).

Siguen pendientes checklist detallado de persistencia, accesibilidad y rendimiento, además de cuentas y backend. La prueba de pantallas no acredita registro, aprobación, apelaciones o espera persistida de 30 días. Los indicadores physical_device_tested=false del archivo de procedencia de la APK describen el estado al preparar esa entrega, anterior a este reporte; se conserva ese antecedente sin reescribirlo.
