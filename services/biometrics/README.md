# Servicio de biometría

Pendiente de prueba de viabilidad. Evaluar OpenCV con YuNet y SFace para comparación uno a uno, y una solución de detección de vida con licencia y evaluación independiente.

Ejecutar como trabajador aislado para que inferencia no bloquee rutas y alertas. Tomar trabajos persistidos y guardar resultados con modelo, umbral, estado y fecha. Un fallo o vencimiento conserva estado pendiente o fallido; nunca aprobar automáticamente. No descargar modelos ni añadir imágenes reales sin resolver finalidad y licencia.
