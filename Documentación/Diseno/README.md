# Cinco propuestas para la aplicación Köra

24/11/2026 · Diseño 0.1 · CAM-2026-006. Se conservan las cinco alternativas originales. Actualización CAM-2026-007: el usuario eligió premium y cambio de color en la aplicación móvil. La base Flutter adapta la composición Premium Órbita; instrucciones vigentes en [MOVIL_APARIENCIA](../MOVIL_APARIENCIA.md). Las demás propuestas se conservan para referencia.

Abrir [la vista navegable](prototipos.html) en un navegador. Conservar los archivos CSS, JS y la carpeta Imagenes junto al HTML. Se ejecuta localmente sin servidor ni instalación; las fuentes web son opcionales y tienen sustitución local. GitHub muestra el código del HTML: para probarlo, descargar el repositorio y abrir el archivo. No se ha publicado un sitio independiente.

## Propuestas

| Nombre | Dirección y composición | Ventaja propuesta | Aspecto por validar |
|---|---|---|---|
| Premium Platino | Grafito y platino, tarjetas, tipografía editorial y superficies metálicas | Jerarquía visible y sensación de calidad | Contraste y sobriedad de reflejos en pantallas físicas |
| Premium Órbita | Mapa oscuro de fondo y panel inferior | Inmersión y continuidad espacial | Altura del panel, lectura de mapa y acceso a ayuda |
| Sencilla Clara | Marfil y verde profundo, formulario directo y navegación familiar | Claridad y menor complejidad visual | Primer uso, lectura al sol y rapidez para repetir un viaje |
| Sencilla Paso a Paso | Marfil y azul, secuencia planea/revisa/viaja | Menos decisiones simultáneas | Si los pasos facilitan el uso o añaden fricción |
| 3D Trayecto | Ciudad ilustrada, cobalto y coral, profundidad y movimiento suave | Personalidad y una bienvenida reconocible | Rendimiento, distracción, consumo y movimiento reducido |

Recomendación inicial de diseño: **Sencilla Clara** como punto de partida funcional; **Premium Órbita** si prima la sensación inmersiva. La opción 3D puede aportar una ilustración de bienvenida a la opción elegida sin transformar el seguimiento en una escena decorativa. Es una valoración de diseño, no resultado de pruebas con usuarias ni selección aprobada. No se asignan puntuaciones de usabilidad inventadas.

## Láminas

- [Premium Platino](Imagenes/premium-platino.png).
- [Premium Órbita](Imagenes/premium-orbita.png).
- [Sencilla Clara](Imagenes/sencilla-clara.png).
- [Sencilla Paso a Paso](Imagenes/sencilla-pasos.png).
- [3D Trayecto](Imagenes/trayecto-3d.png).
- [Ilustración 3D reutilizable](Imagenes/ciudad-3d.png).

Cada lámina contiene inicio, preparación y viaje en curso. La vista navegable añade ambos perfiles, formulario editable, navegación, perfil, instrucciones de identidad, compartir y aviso pendiente. Las pantallas de muestra son escenarios independientes; cambiar de escenario desde el estudio no valida identidad ni inicia un viaje real.

## Textos y estados que prevalecen

Las imágenes generadas con IA exploran dirección artística y contienen variaciones de texto e iconos. Para implementación prevalecen [la guía de interacción](GUIA_INTERACCION.md), el prototipo y la visión vigente. En particular: pendiente se representa con reloj y tono neutral; nunca con escudo aprobado o verde de éxito. Las láminas Platino y Clara requieren esa corrección de semántica antes de convertirse en pantallas Flutter. Los mapas y nombres son ejemplos ficticios; no convierten el producto en un servicio exclusivo universitario. El perfil de conductora se identifica de forma explícita y no se deduce del avatar.

No hay resultados de biometría, posición GPS, enlace compartido ni atención reales. La etiqueta «Identidad verificada · estado de muestra» del prototipo pertenece a un escenario de diseño; no produce ni autoriza viajes. En producto, ese estado solo puede proceder del backend.

## Selección y entrega al desarrollo

1. Comparar las cinco propuestas con el mismo perfil y pantalla. Revisar por separado Pasajera y Conductora.
2. Probar destino, preparación, estados de identidad, lectura del último dato, compartir y ayuda pendiente. Repetir con conexión interrumpida y movimiento reducido.
3. Registrar preferida, aspectos a conservar y obstáculos concretos. Si se combinan estilos, documentar una sola familia final coherente.
4. Convertir la opción elegida en componentes Flutter, estados y rutas a partir de [tokens.json](tokens.json). Completar requisitos y contratos de la primera historia antes del código funcional.
5. Ampliar el diseño final a registro y consentimiento, aprobación, captura biométrica detenida, historial, enlaces y derechos de datos. Las cinco propuestas son alternativas de dirección visual, no una especificación exhaustiva de todos los RF ni una fase cerrada.

Archivos editables: HTML, CSS, JS y JSON. Las láminas son PNG; no se presentan como archivos Figma ni como modelos 3D editables. La ciudad es una ilustración prerenderizada con profundidad y animación de capa, no un motor 3D en tiempo real. Método y prompts exactos en [prompts.json](prompts.json).
