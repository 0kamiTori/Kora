# Diagnóstico del punto de partida de Köra

Fecha de revisión: 18/11/2026. Cambio CAM-2026-003. Rama de trabajo: codex/diagnostico-f0.

Se completó la revisión documental del primer paso de F0. Hay una base suficiente para delimitar el producto y preparar requisitos, pero todavía no se pueden comprometer fechas, dedicación o gastos. Completar esta revisión no significa cerrar F0 ni aprobar el SRS o la arquitectura para el piloto.

## Evidencia revisada

Se leyeron AGENTS.md, README.md, PLAN_MOVIL.md, ARQUITECTURA.md, SINCRONIZACION.md, ESTADO.md, DECISIONES.md, GUIA_CODEX.md, CHANGELOG.md, project-plan.json, los contratos REST y eventos y el verificador documental. Se inspeccionaron los Word de plan general y registro para comprobar los hallazgos y registrar esta revisión. No se revalidaron en esta tarea las referencias académicas originales, tarifas de proveedores ni el estado remoto de GitHub.

El árbol local estaba limpio al comenzar y su commit era a75c424. apps/mobile y apps/admin-web contienen README y configuración de ejemplo; services/api contiene los mismos tipos de archivos y services/biometrics un README. No hay proyectos de aplicación inicializados, migraciones ni una APK en esas carpetas. Esto coincide con el estado documentado.

## Acuerdos y directrices vigentes

Estos elementos se sustentan en las instrucciones del usuario. Su vigencia para el trabajo no equivale a aprobación académica del director.

| ID | Elemento | Evidencia y alcance |
|---|---|---|
| A01 | Nombre Köra y repositorio 0kamiTori/Kora | Nombre y URL indicados por el usuario; origin local coincide. |
| A02 | Android como producto principal | Instrucciones del proyecto proporcionadas por el usuario; perfiles de pasajera y conductora. |
| A03 | Web paralela con backend y datos compartidos | Solicitud del usuario e instrucciones del proyecto; no crear bases independientes por cliente. |
| A04 | Flutter, React, FastAPI y PostgreSQL/PostGIS como directriz de trabajo | AGENTS.md vigente. Compatibilidad, versiones exactas y mediciones siguen por comprobar. |
| A05 | Desarrollo incremental con registro de cambios | AGENTS.md: una historia verificable, ramas codex, evidencias y actualización de documentos. |
| A06 | Autorización y reglas críticas en servidor | AGENTS.md: identidad, permisos, transiciones y alertas validados en backend. |

## Supuestos que todavía no son compromisos

| ID | Supuesto vigente | Qué falta para confirmarlo |
|---|---|---|
| S01 | 23/11/2026 a 11/04/2027 y 20 semanas | Fecha de notificación y vencimiento académico aplicables, además de inicio real. |
| S02 | Dos responsables distintos con 20 h semanales cada uno | Nombres, funciones y disponibilidad real; reducción festiva y vacaciones. |
| S03 | 380 h móviles, 304 h previstas y 76 h de reserva | Son cálculos consistentes condicionados a S02, no capacidad ya acreditada. |
| S04 | 1.705.000 COP operativos y 10.065.000 COP con trabajo valorado | Fondos disponibles, responsables de pago y cotizaciones; 20.000 COP/h es una valoración propuesta. |
| S05 | Equipos existentes y dos Android para pruebas | Inventario de hardware y acceso a dispositivos. |
| S06 | Una APK por perfiles y exclusiones del MVP | Revisar alcance: pagos, iOS, tiendas y operación comercial están excluidos en el plan propuesto. |
| S07 | Render y tres mensualidades de operación compartida | Medir recursos y definir fechas de activación, planes, facturación y costos completos. |
| S08 | Detección de vida viable con reserva de 300.000 COP | Ensayo, licencia y cotización; el monto no garantiza una solución adecuada. |
| S09 | Metas de latencia, biometría, rutas y usabilidad | Protocolo, muestra, dispositivos y criterios de evaluación acordados antes de calibrar. |

## Hallazgos y aclaraciones

| ID y tipo | Evidencia | Implicación y acción propuesta |
|---|---|---|
| H01 Desactualización documental | Word 02, Paso 4: crear repositorio privado. README y ESTADO describen el repositorio ya creado y público. | Actualizar esa instrucción para usar el repositorio existente. No cambiar visibilidad ni crear otro repositorio como resultado automático del diagnóstico. |
| H02 Restricción del verificador | validate_foundation.py exige academic_deadline_confirmed is False. DEC07 prevé confirmar el plazo más adelante. | Una confirmación legítima haría fallar el control. En una tarea posterior, aceptar ambos estados y exigir evidencia y coherencia de fechas cuando se marque confirmado. No cambiar la bandera en esta revisión. |
| H03 Dato temporal incompleto | SINCRONIZACION exige identidad y vida vigentes; Verification ofrece estado expired pero no fechas de validación o expiración ni vínculo versionado de política. | Definir vigencia y representación en F1 antes de implementar autorización de inicio. La existencia de expired por sí sola no define cuándo vence. |
| H04 Cobertura parcial de requisitos | openapi.json declara expresamente ser parcial. No define aún aprobación de conductoras, alta de evidencia, renovación y cierre de sesión, historial, enlaces compartidos ni ciclo completo de consentimiento. | Completar una matriz RF → operación → aceptación en F1. Es una brecha esperada de diseño, no prueba de un fallo en una aplicación ya construida. |
| H05 Ambigüedad de disponibilidad | project-plan.json asigna 0 h/semana a supervisión del piloto y su texto dice disponible durante sesiones; el plan Word 04 dice durante sesiones. | Aclarar posteriormente la representación de trabajo no recurrente y estimar cobertura por sesión. No interpretar cero como ausencia de supervisión ni asignar a alguien sin confirmación. |
| H06 Dependencia de calendario y gasto | Plan propuesto de 20 semanas y presupuesto de tres meses cloud, sin fechas concretas de activación. | No hay contradicción aritmética: parte del trabajo será local. Definir ventanas de servicio para comprobar si caben las mensualidades y su reserva. |

Los antecedentes de 22 semanas y el presupuesto original no se adoptan como calendario o costo actual: README y anexo 04 ya declaran la prevalencia del escenario móvil. No se modificó la propuesta académica fuente ni se dieron por verificadas sus referencias bibliográficas.

## Información pendiente por prioridad

Responsables y momentos siguientes son asignaciones sugeridas, no aceptaciones ni fechas oficiales. P0 afecta el compromiso del plan; P1 condiciona diseño o trabajo con datos; P2 debe resolverse antes de evaluar y entregar.

| ID | Prioridad | Información o decisión | Quién debe aportarla | Momento límite propuesto |
|---|---|---|---|---|
| P01 | P0 | Fecha de notificación, plazo vigente y fecha límite oficial | Usuario con director o coordinación | Antes de cerrar F0 y comprometer entrega |
| P02 | P0 | Quién hace móvil, web y backend; horas semanales reales y ausencias | Integrantes del equipo | Antes de cerrar F0 |
| P03 | P0 | Dinero efectivo disponible, quién paga y qué servicios cubre | Usuario y equipo | Antes de comprometer gastos; estimación revisada en F0 |
| P04 | P0 | Alcance de la primera versión y exclusiones; una app o paquetes separados | Usuario y responsable web | Paso 2 de F0 |
| P05 | P1 | Equipos, teléfonos y acceso a recursos | Cada integrante | Paso de inventario de F0 |
| P06 | P1 | Reglas de admisión, aprobación de conductoras, sesión y casos de error | Equipo y director cuando corresponda | F1 antes de implementar |
| P07 | P1 | Política de vigencia biométrica y solución de detección de vida | Responsable técnico por designar | Requisitos en F1 y ensayo en F2 |
| P08 | P1 | Responsable de datos, consentimiento, retención y eliminación | Equipo con instancia institucional correspondiente | Antes de captar datos reales |
| P09 | P1 | Destinatarios, cobertura y protocolo de atención de alertas | Responsable del piloto por designar | Antes de probar ayuda con participantes |
| P10 | P1 | Plan cloud, fecha de activación, respaldo y costo completo | Responsables técnicos | F2 antes de contratar o desplegar |
| P11 | P2 | Muestra, escenarios, métricas, criterios de suspensión y evaluación | Equipo y director | Antes de calibrar y ejecutar el piloto |
| P12 | P2 | Verificación bibliográfica y evidencia final académica | Autores | Durante la preparación académica y antes de citar como evidencia |

## Qué puede continuar

Se puede continuar con el paso 2 de F0: delimitar el recorrido mínimo y presentar exclusiones para revisión. También se pueden redactar requisitos y explorar interfaces con datos sintéticos. No hace falta resolver ahora todos los proveedores para completar ese trabajo.

No se puede declarar cerrado F0 ni comprometer el 11/04/2027 mientras P01 y P02 sigan abiertos. Tampoco se puede asumir financiación, contratar servicios ni iniciar un piloto con personas porque los montos y protocolos figuren en documentos propuestos.

## Verificación de esta revisión

Se comprobaron las sumas de semanas, horas y costos con scripts/validate_foundation.py. El control no valida viabilidad del cronograma, financiación, calidad biométrica ni funcionamiento de una aplicación. El resultado local y la inspección del registro Word se conservan con la revisión; no se ejecutaron pruebas móviles ni se declararon funciones implementadas.

Estado del primer paso: revisión documental realizada y registrada. Estado de F0: en curso. Próximo paso: delimitar el alcance con las confirmaciones P01 a P04 como entradas prioritarias.
