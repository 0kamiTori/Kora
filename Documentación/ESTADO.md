# Estado del proyecto
24/11/2026 · revisión 0.7 · CAM-2026-007.

## Base vigente
Entrega tentativa del sistema completo 14/01/2027. Julian en móvil, John en web y ambos en backend; unas 30 h por persona a la semana. Presupuesto de referencia del documento principal. Fechas, capacidad y financiación no son compromisos nuevos ni aprobación académica.

## Avance real
apps/mobile es una aplicación Flutter Android inicializada: Inicio premium, Viajes sin datos, Perfil y Apariencia. APP01 permite seis acentos y RGB personalizado, cancelar, restaurar y recuperar preferencia local; errores y escrituras rápidas controlados. Premium elegido por el usuario; Órbita es composición de implementación. Ver [MOVIL_APARIENCIA.md](MOVIL_APARIENCIA.md).

F0 continúa en curso. APP01 es preparación independiente; no cierra F1 ni F2. No hay backend o web ejecutables, cuentas, biometría, GPS, viajes reales ni alertas. Los contratos continúan como diseños parciales. El dibujo del inicio no es ubicación ni mapa operativo. No se muestran verificaciones simuladas. Los dobles de almacenamiento existen solo en test.

## Evidencia local de APP01
Flutter 3.50.1, Dart 3.14.0. Análisis estático sin incidencias y doce pruebas locales aprobadas, incluida captura visual; la prueba opcional de captura se omite en CI. Cubren preferencia tras recrear controlador, lectura/escritura fallidas, selecciones rápidas, cancelación, restauración, color global, contraste de colores y texto al doble de tamaño. Capturas Flutter revisadas por separado del prototipo HTML. No equivalen a ejecución Android física.

Flutter preparado fuera del repositorio. Android SDK no está instalado localmente; no se construyó ni ejecutó APK en este equipo. Workflow Android añadido para analizar, probar y generar APK debug en GitHub; comprobar resultado y artefacto al publicar. Instalación en teléfono, plugin tras cierre real, TalkBack y rendimiento están pendientes. Los Word 01, 02 y 03 incorporan CAM-2026-007 y requieren su revisión visual al cierre.

Se refrescaron la clasificación de dependencias del lock y el formato bajo Dart 3.14 tras la primera comprobación Linux; no cambia el comportamiento de APP01. Los tres Word quedaron renderizados e inspeccionados: 10, 6 y 8 páginas. El dispositivo indicado para la prueba física es Redmi Note 15 Pro con Android 16, aún no probado.

## Próxima tarea verificable
Revisar APP01 en Android físico con la APK de desarrollo cuando esté disponible. Completar después SRS de RF01 (registro, consentimiento y roles), contrato necesario y responsable/revisor backend antes del código funcional. Web y API compartida siguen pendientes; no crear fuentes de identidad separadas por cliente.

## Antecedentes
Las cinco propuestas y el HTML se conservan en Diseno, como exploración anterior. Las evidencias documentales CAM005 y diseño CAM006 se conservan en Git y Word; no se atribuyen al funcionamiento del producto. Ver [decisiones](DECISIONES.md), [plan](PLAN_MOVIL.md) y [pendientes](PENDIENTES.md).
