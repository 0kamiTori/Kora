# Estado del proyecto
27/11/2026 · revisión documental 0.11 · CAM-2026-011. Las secciones anteriores a «Portal web y API inicial» describen el estado previo y se conservan como registro: donde dicen que no hay web o backend ejecutables, prevalece esa última sección.

## Base vigente
Entrega tentativa del sistema completo 14/01/2027. Julian en móvil, John en web y ambos en backend; unas 30 h por persona a la semana. Presupuesto de referencia del documento principal. Fechas, capacidad y financiación no son compromisos nuevos ni aprobación académica.

## Avance real
apps/mobile es una aplicación Flutter Android inicializada: Inicio premium, Viajes sin datos, Perfil y Apariencia. APP01 permite seis acentos y RGB personalizado, cancelar, restaurar y recuperar preferencia local; errores y escrituras rápidas controlados. Premium elegido por el usuario; Órbita es composición de implementación. Ver [MOVIL_APARIENCIA.md](MOVIL_APARIENCIA.md).

F0 continúa en curso. APP01 es preparación independiente; no cierra F1 ni F2. No hay backend o web ejecutables, cuentas, biometría, GPS, viajes reales ni alertas. Los contratos continúan como diseños parciales. El dibujo del inicio no es ubicación ni mapa operativo. No se muestran verificaciones simuladas. Los dobles de almacenamiento existen solo en test.

## Evidencia local de APP01
Flutter 3.50.1, Dart 3.14.0. Análisis estático sin incidencias y doce pruebas locales aprobadas, incluida captura visual; la prueba opcional de captura se omite en CI. Cubren preferencia tras recrear controlador, lectura/escritura fallidas, selecciones rápidas, cancelación, restauración, color global, contraste de colores y texto al doble de tamaño. Capturas Flutter revisadas por separado del prototipo HTML. No equivalen a ejecución Android física.

Flutter preparado fuera del repositorio. Android SDK no está instalado localmente; no se construyó ni ejecutó APK en este equipo. Workflow Android añadido para analizar, probar y generar APK debug en GitHub, con resultado aprobado según la evidencia siguiente. Instalación en teléfono, plugin tras cierre real, TalkBack y rendimiento están pendientes. Los Word 01, 02 y 03 incorporan CAM-2026-007 y quedaron revisados visualmente.

Se refrescaron la clasificación de dependencias del lock y el formato bajo Dart 3.14 tras la primera comprobación Linux; no cambia el comportamiento de APP01. Los tres Word quedaron renderizados e inspeccionados: 10, 6 y 8 páginas. El dispositivo indicado para la prueba física es Redmi Note 15 Pro con Android 16, aún no probado.

## Evidencia Android en GitHub
La [ejecución 45472492695](https://github.com/0kamiTori/Kora/actions/runs/45472492695) aprobó formato, análisis, once pruebas y compilación APK debug del commit 48033679a135fa27752217ab6841a2103cc70e0a. Artefacto kora-android-debug, ID 14958721383. Compilación y pruebas de widgets no equivalen a instalación o pruebas instrumentadas Android. La aceptación física sigue pendiente.

## Próxima tarea verificable
Cerrar los pendientes de RF01_REGISTRO.md y completar el contrato de registro, con implementador y revisor del backend antes del código funcional. La primera entrega académica es registro y aprobación; la biometría se desarrolla e integra en segunda entrega. Web y API compartida siguen pendientes; no crear fuentes de identidad separadas por cliente. No se habilitan viajes operativos en el primer avance.

## Antecedentes
Las cinco propuestas y el HTML se conservan en Diseno, como exploración anterior. Las evidencias documentales CAM005 y diseño CAM006 se conservan en Git y Word; no se atribuyen al funcionamiento del producto. Ver [decisiones](DECISIONES.md), [plan](PLAN_MOVIL.md) y [pendientes](PENDIENTES.md).

## Acuerdos y prueba reportada el 26 de noviembre

RF01_REGISTRO.md contiene las reglas acordadas y mensajes; son requisitos, no funciones implementadas. La primera entrega se divide de la biometría sin reducir el sistema final ni alterar fechas o presupuesto. El usuario reporta que la primera APK funciona correctamente en Redmi Note 15 Pro con Android 16; falta evidencia por caso de persistencia, accesibilidad y rendimiento. Las referencias anteriores a prueba física pendiente se refieren a esas verificaciones específicas, no a ausencia de toda prueba del usuario. Ninguna fase se cierra.

## Sincronización Word pendiente

CAM-2026-008 queda registrado en los documentos de texto. Las versiones actualizadas de Word 01/02/03 están preparadas localmente, pero el renderizador no dispone de LibreOffice y Word no completó la exportación a PDF. Se preservan los Word vigentes anteriores hasta renderizar e inspeccionar las nuevas versiones; no declarar completa la sincronización documental ni publicar candidatos sin revisión.

## Pantallas APP02

26/11/2026 · revisión documental 0.10 · CAM-2026-010. Flutter 0.2.0+2 añade registro, solicitud, estado y apelaciones desde Perfil con apariencia premium configurable. Validaciones locales y modelo de revisión separado de widgets; nueve pruebas nuevas, 20 funcionales aprobadas en total y análisis limpio. Las capturas son de widgets con escenarios de prueba, no decisiones reales. No hay alta, envío de solicitud, historial o revisión administrativa funcionales. Documentos y biometría siguen aplazados. El plazo de 30 días se presenta con fecha y permiso de servidor, aún no implementado. [Guía de pantallas](PANTALLAS_REGISTRO.md).

La verificación Word vuelve a fallar incluso con un documento de control de un párrafo. Los Word vigentes siguen preservados; candidatos CAM008 y CAM009 preparados localmente sin publicación hasta renderizar e inspeccionar. No atribuir este límite a un bloqueo del usuario. La próxima historia funcional necesita contrato y backend compartidos; APP02 no cierra RF01, RF02 ni ninguna fase.

## Evidencia remota y entrega APP02

La ejecución Android 45910392743 aprobó formato, análisis, 20 pruebas y APK debug del commit b6da6476a0dcf897ba2cc266c86b928a009f59fd. Artefacto 15160225624, versión 0.2.0+2, descargado y verificado. Guía y procedencia en PANTALLAS_REGISTRO.md. Instalación física de APP02 y backend pendientes. README, AGENTS, COMPONENTES y GUIA_CODEX incorporan el contexto nuevo. Se preservan los Word vigentes por el fallo de render documentado.

## Primer paso funcional de registro y reporte APP02

CAM-2026-010. Contrato v2 de política y alta preparado en CONTRATO_REGISTRO.md y Contratos/registration-v2.openapi.json, con migración que conserva v1. 49 comprobaciones de esquema y referencias pasan localmente. No hay API, conexión Neon o cuentas funcionales, y no se modifica código Flutter. Julian se declara responsable; el consentimiento aprobado y los contactos siguen pendientes; el contrato mantiene deshabilitado el registro real en esa situación. Próxima historia: revisión técnica, asignación de implementador/revisor y API con migraciones y pruebas REG01–REG11.

El usuario reporta revisión correcta de APP02 en su teléfono con tirones. PRUEBA_APP02.md registra evidencia declarada y PERF01 pendiente; no se atribuye rendimiento medido ni corrección futura automática. Las referencias anteriores a instalación física pendiente describen el momento de entrega o el checklist específico, no ausencia de esta prueba general.

Word: candidatos CAM010 preparados localmente; se preservan los vigentes por el fallo de render ya documentado. No se vuelven a declarar sincronizados ni se cierra fase.

## Responsable declarado y material de pruebas

El usuario designa a Julian Hernando Perez Villamizar como responsable del tratamiento. CONSENTIMIENTO_CUENTA_BORRADOR.md es una propuesta para revisión, con contacto, conservación y condiciones operativas aún por completar; no una autorización legal o institucional aprobada. Se conserva registro real deshabilitado. DATOS_PRUEBA_REGISTRO.md explica 12 escenarios sintéticos, sin envíos o cuentas reales; su forma y los 49 ejemplos de esquema pasan localmente.

La ejecución inicial de CI 45940413728 falló al interpretar YAML por el comando de instalación. Se corrigió con bloque multilínea y comprobación de sintaxis local; la ejecución corregida 45941147338 del commit ba5c7bd984fe9cf6e702b58d125a3dee9b91b440 terminó correctamente: verificación inicial, 49 ejemplos y forma de 12 escenarios sintéticos. No ejecutó backend ni pruebas de negocio. No se realizan cambios Flutter o despliegue. Word candidatos actualizados localmente con esta declaración y borrador; vigentes sin sustituir por el bloqueo conocido de render.

## Portal web y API inicial

27/11/2026 · CAM-2026-011. John incorpora el portal administrativo en apps/admin-web y una primera API en services/api, desarrollados fuera del repositorio entre el 23 y el 27 de noviembre. Rama codex/web-admin-y-api-inicial, pendiente de revisión por Julian antes de integrarse en main.

**Portal.** React 18, TypeScript estricto y Vite 5. Pantallas de sesión, panel, conductoras, viajes, alertas, parámetros, auditoría, solicitudes de datos y seguimiento público. Por defecto usa un adaptador de datos sintéticos en memoria; con VITE_USE_MOCKS=false consume la API. Instrucciones en apps/admin-web/README.md.

**API.** FastAPI con PostgreSQL mediante SQL directo; esquema en services/api/db. Sirve las rutas que el portal necesita, con permisos por rol comprobados en servidor, auditoría de consultas sensibles, WebSocket administrativo y detección de desviación, parada y pérdida de señal. Instrucciones en services/api/README.md.

**Lo que no cumple.** La API no implementa el contrato de registro v2 ni el diseño v1 de Contratos/openapi.json. Difieren rutas, estados de viaje y de alerta, eventos persistidos con secuencia, idempotencia, PostGIS, SQLAlchemy y Alembic, y la versión de Python. Las rutas /api/v1/mobile son provisionales para generar datos sintéticos: Flutter no debe integrarse contra ellas. REG01–REG11 siguen sin ejecutar. Conciliación registrada como P12 y DEC47.

**Biometría y avisos.** No hay motor biométrico: la verificación queda pendiente y la API impide aprobar a una conductora sin identidad confirmada, de modo que hoy ninguna puede aprobarse. Esto no coincide con la primera entrega de registro y aprobación sin biometría; queda por decidir en P12. El doble simulado solo se activa con APP_ENV=test. No hay push, SMS ni bandeja de salida; las alertas solo llegan al portal.

**Evidencia local.** Ocho pruebas de integración de la API aprobadas contra PostgreSQL 18 local desde services/api, con datos sintéticos: sesión y permisos, revisión de conductoras, consulta justificada, viaje con alerta de desviación, pérdida de señal, enlace público, parámetros y solicitudes de datos. El portal se recorrió en navegador contra la API con una sesión administrativa y listas vacías. Las pruebas unitarias y de extremo a extremo del portal no se volvieron a ejecutar al incorporarlo. No hay workflow de CI para web ni API. Probado con Python 3.11, no 3.12.

**Base Neon.** Durante el desarrollo local la API se ejecutó contra la base Neon compartida. Se aplicaron los scripts 001 y 002 (26 tablas) y se crearon cuatro usuarios administrativos sintéticos con una contraseña de demostración conocida, además de registros de auditoría de inicio de sesión. No hay cuentas de pasajeras ni conductoras. Antes de cualquier despliegue hay que sustituir esos usuarios y rotar la credencial de la base, que se compartió por un canal no seguro. La credencial no está en Git.

No cambian apps/mobile, contratos, fechas ni presupuesto. Los Word 01, 02 y 03 no se actualizan en este cambio. Ninguna fase se cierra.
