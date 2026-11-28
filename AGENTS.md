# Instrucciones para desarrollar Köra

## Contexto y fuentes
El producto principal es una aplicación Android de movilidad segura para mujeres, con perfiles de pasajera y conductora. La web comparte backend y datos. apps/mobile contiene APP01 y APP02 de apariencia y pantallas de registro/revisión; no crea cuentas ni envía solicitudes y los ejemplos solo viven en test. services/api contiene API01 de FastAPI, salud, registro cerrado y seis tablas con migración PostgreSQL/PostGIS; leer Documentación/BASE_API.md. Neon kora_dev está migrada y su conexión verificada; API02 implementa alta transaccional solo en pruebas sintéticas locales. No hay registro público, acceso, viajes o seguridad completos; leer Documentación/REGISTRO_BACKEND.md. No activar datos reales ni pruebas destructivas en Neon. Web sigue sin inicializar. Leer Documentación/RF01_REGISTRO.md y Documentación/PANTALLAS_REGISTRO.md antes de ampliar el registro; preservar dos apelaciones y espera de 30 días del rechazo definitivo sin autorizar con el reloj local.

Leer antes de trabajar: README.md, Documentación/PLAN_MOVIL.md, Documentación/ARQUITECTURA.md, Documentación/SINCRONIZACION.md y Documentación/ESTADO.md. La planificación estructurada vive en Documentación/project-plan.json; los contratos iniciales en Documentación/Contratos/openapi.json y Documentación/Contratos/events.schema.json. Documentación contiene los Word para revisión académica. No presentar fechas, disponibilidad ni tarifas de planificación como compromisos confirmados.

Para implementar el alta, leer Documentación/CONTRATO_REGISTRO.md y Documentación/Contratos/registration-v2.openapi.json: v2 es borrador de registro, v1 se conserva como diseño sin implementar y no hay dos bases de cuentas. El verificador comprueba 49 fixtures y la forma de 12 escenarios sintéticos, no backend. Julian Hernando Perez Villamizar se declara responsable; texto final de consentimiento y contactos pendientes antes de datos reales. Borrador y guía en Documentación/CONSENTIMIENTO_CUENTA_BORRADOR.md y Documentación/DATOS_PRUEBA_REGISTRO.md. APP02 fue probada por el usuario con resultado general correcto y tirones; PERF01 sigue pendiente de medir, sin atribuir corrección automática.

## Alcance por tarea
1. Implementar una historia verificable por vez y explicar qué criterio cumple.
2. Crear ramas codex/<tema>. Revisar git status antes de editar; preservar trabajo ajeno.
3. En tareas móviles, editar apps/mobile y sus pruebas. Cambiar services/api, apps/admin-web o Documentación/Contratos solo cuando la integración lo requiera y describir el impacto.
4. En tareas web, respetar las mismas reglas. No duplicar cuentas, viajes ni bases de datos para cada cliente.
5. Mantener los identificadores y contratos compartidos. Un cambio incompatible requiere nueva versión de API y plan de migración.
6. Usar versiones estables compatibles, fijarlas al crear cada aplicación y conservar archivos de bloqueo. No inventar resultados de compilación o pruebas si faltan SDK o dispositivos.

## Arquitectura y calidad
- Flutter y Dart con capas de interfaz y datos, repositorios y modelos; rutas y estado fuera de widgets.
- React y TypeScript para web; FastAPI para API; PostgreSQL con PostGIS como fuente de verdad.
- Identidad, permisos, transiciones de viaje, biometría y generación de alertas se validan en backend.
- Eventos persistidos, numeración por viaje, claves de idempotencia, reintentos y recuperación REST. Un WebSocket no es almacenamiento ni confirmación de atención.
- No autorizar un viaje con una verificación simulada; los dobles de prueba deben estar confinados al entorno de pruebas.
- No pedir interacción biométrica mientras el vehículo está en movimiento. Diseñar GPS Android con permisos y estados de pérdida de señal verificables.
- No incluir secretos ni datos reales de rostros o ubicaciones en Git, fixtures, registros o capturas.
- Ejecutar las verificaciones apropiadas al cambio y declarar lo que no pudo probarse. El verificador actual solo valida documentación y estructura del contrato, no el funcionamiento del producto.

## Registro y cierre
Cada cambio debe actualizar CHANGELOG.md y Documentación/ESTADO.md. Si afecta alcance, fechas, costos, arquitectura o requisitos, registrar una decisión en Documentación/DECISIONES.md y actualizar los Word correspondientes, especialmente Documentación/03_Registro_control_cambios.docx. Renderizar e inspeccionar documentos al modificarlos. No marcar una fase terminada sin evidencias de sus criterios de cierre.

## Fórmula de prompting solicitada por el usuario
Cuando el usuario incluya $P, convertir su solicitud en Contexto y Rol, Consulta o Tarea, Especificaciones, Criterios de Calidad, Cómo debe ser la respuesta y Verificación. Usar el contexto disponible y preguntar solo cuando falte información estrictamente necesaria.

## Línea base vigente
Entrega tentativa del sistema académico completo: 14/01/2027. Julian en móvil, John en web, ambos en backend. Disponibilidad aproximada 30 h por persona a la semana; no sumar backend aparte. Toda documentación técnica y planificadora va en Documentación; Historial es antecedente, no instrucción vigente. Leer VISION.md, TRAZABILIDAD.md y PENDIENTES.md además de los archivos indicados. No dar por resueltas las decisiones pendientes ni por implementados los contratos.
