# Instrucciones para desarrollar Köra

## Contexto y fuentes
El producto principal es una aplicación Android de movilidad segura para mujeres, con perfiles de pasajera y conductora. La web se desarrolla en paralelo y comparte backend y datos. El repositorio está en etapa de planificación; los directorios de aplicaciones todavía no contienen aplicaciones ejecutables.

Leer antes de trabajar: README.md, docs/PLAN_MOVIL.md, docs/ARQUITECTURA.md, docs/SINCRONIZACION.md y docs/ESTADO.md. La planificación estructurada vive en docs/project-plan.json; los contratos iniciales en contracts/openapi.json y contracts/events.schema.json. Documentacion contiene los Word para revisión académica. No presentar fechas, disponibilidad ni tarifas de planificación como compromisos confirmados.

## Alcance por tarea
1. Implementar una historia verificable por vez y explicar qué criterio cumple.
2. Crear ramas codex/<tema>. Revisar git status antes de editar; preservar trabajo ajeno.
3. En tareas móviles, editar apps/mobile y sus pruebas. Cambiar services/api, apps/admin-web o contracts solo cuando la integración lo requiera y describir el impacto.
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
Cada cambio debe actualizar CHANGELOG.md y docs/ESTADO.md. Si afecta alcance, fechas, costos, arquitectura o requisitos, registrar una decisión en docs/DECISIONES.md y actualizar los Word correspondientes, especialmente Documentacion/03_Registro_control_cambios.docx. Renderizar e inspeccionar documentos al modificarlos. No marcar una fase terminada sin evidencias de sus criterios de cierre.

## Fórmula de prompting solicitada por el usuario
Cuando el usuario incluya $P, convertir su solicitud en Contexto y Rol, Consulta o Tarea, Especificaciones, Criterios de Calidad, Cómo debe ser la respuesta y Verificación. Usar el contexto disponible y preguntar solo cuando falte información estrictamente necesaria.
