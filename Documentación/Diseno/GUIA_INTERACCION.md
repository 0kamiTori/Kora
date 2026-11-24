# Guía de interacción para elegir y trasladar el diseño

Esta guía conserva la exploración de cinco direcciones visuales. No sustituye visión, contratos o SRS. En CAM-2026-007 el usuario eligió premium con color configurable; APP01 adapta Órbita en Flutter. La aceptación visual y de accesibilidad en Android físico sigue pendiente.

## Flujos y correspondencia

| Flujo | Pasajera | Conductora | Requisitos |
|---|---|---|---|
| Inicio | Punto de encuentro, destino y acción de planear | Solicitudes y preparación; sin pagos | RF03, RF06, RF11 |
| Antes de iniciar | Datos de conductora y resultado pendiente visible | Instrucciones de verificación con vehículo detenido | RF02, RF03, RF04, RF05 |
| En viaje | Ruta, antigüedad de posición, identidad, compartir y ayuda | Trayecto sin decoración en movimiento y acceso a ayuda | RF05, RF07, RF08, RF09, RF10, RF11 |
| Perfil | Entrada a privacidad, consentimiento y contacto | Misma identidad y permisos de backend | RF01, RF13 |

Faltan diseñar en detalle los formularios de alta, recuperación de cuenta, aprobación administrativa y capturas de identidad, errores biométricos, incidentes y cierre, historial, vigencia/revocación del enlace y solicitudes de datos. La web administrativa corresponde a John y no se rediseña en este encargo. Los permisos y estados serán compartidos, no recreados por cada interfaz.

## Semántica obligatoria

- Pendiente: reloj, texto explícito y tono neutral; no check de aprobado.
- Fallida o vencida: causa legible y acción segura; no autorización de inicio.
- Verificada: estado vigente proporcionado por backend con vínculo a conductora y viaje, no resultado local inferido.
- Ubicación: mostrar antigüedad y conectividad; señalar dato obsoleto. Una animación no representa precisión o cobertura GPS.
- Avisos: diferenciar pendiente, enviado al canal, entregado, atendido y resuelto. Ningún botón ni animación prueba atención.
- Ayuda: visible durante el viaje, con etiqueta y forma, no solo color. Sin promesa de rescate automático.
- Compartir: enlace opaco, temporal y revocable del viaje autorizado. No mostrar rostros ni historial completo.

## Componentes y accesibilidad propuestos

Base de diseño para Flutter: escala de espaciado de 4/8/12/16/24/32 dp, objetivos táctiles de al menos 48 × 48 dp, tipografía de cuerpo 16 sp, textos auxiliares 12–14 sp y encabezados 28–32 sp. Las láminas y el prototipo son aproximaciones visuales: aplicar tamaño de fuente del sistema, TalkBack y pruebas de contraste en la implementación final. No se declara conformidad accesible sin esas pruebas.

No depender únicamente del color: reloj/check más texto y estado. Mantener orden de foco, nombres accesibles y cierre de diálogos con teclado. No colocar ayuda detrás de un menú. Permitir desplazamiento cuando crece el texto; mantener acciones fuera de zonas tapadas por teclado o barras de sistema. Los estados de carga y error no pueden borrar origen/destino escritos.

## Movimiento de 3D Trayecto

- Ciudad prerenderizada original: oscilación vertical de hasta 6 px y giro aparente de capa de hasta 3 grados en ciclo de 5 s, únicamente como decoración de inicio/preparación.
- La ruta puede tener un efecto suave en vistas de preparación. En seguimiento no hay movimiento decorativo; la posición real solo se actualiza con datos recibidos.
- Respetar reducción de movimiento del sistema y ofrecer interruptor en la vista de revisión. Sin parpadeos ni reproducción de audio.
- En conductora con viaje en curso se desactiva la animación decorativa. Ningún desafío biométrico interactivo se solicita durante la marcha.
- Para Flutter, usar el PNG como recurso ilustrativo y una animación ligera de transformación; la elección de render 3D en tiempo real requeriría medir y justificar nuevos recursos. No se añade motor 3D ni dependencia a la APK en este encargo.

## Prueba comparativa con usuarias

Usar datos sintéticos y presentar las propuestas en orden alternado para reducir sesgo. Pedir: elegir destino, identificar si puede iniciar, localizar Ayuda, explicar la antigüedad del dato y distinguir aviso pendiente de atendido. Registrar éxito, errores, tiempo observado, claridad percibida y comentarios; no sugerir cuál es la mejor. Probar lectura con tamaño de fuente aumentado y movimiento reducido. Los resultados aún no existen y no se sustituyen por la opinión del diseñador.

Decisión final: nombre elegido, elementos combinados si aplica, problemas detectados, correcciones y revisión de ambos autores. Actualizar decisiones, estado y Word de control antes de usarla como base visual definitiva.
