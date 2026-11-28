# Historial de cambios

## 0.14 — 2026-11-27 — CAM-2026-014

- APP03: formulario móvil conectado a política y alta v2, consentimiento recibido del servidor, respuesta confirmada, errores por campo y reintentos con igual clave/cuerpo en memoria.
- Migración 0002_consent_guard corrige el trigger bajo rol limitado mediante SECURITY DEFINER con search_path fijo, EXECUTE público revocado y función sin escrituras de catálogo. Neon actualizado y verificado en 0002, sin cuentas o consentimiento sintéticos.
- Corregidos conflicto de etiqueta debug del manifiesto y lectura de consentimiento que requería UPDATE por FOR SHARE; el catálogo conserva permisos de solo lectura y el trigger verifica aprobación. CI se repite.
- Dio 5.11.1 fijado; protección de URL y ausencia de logs de formulario. Android 0.3.0+3 debug Köra pruebas con identificador separado y HTTP solo en loopback.
- Configuración, Compose y preparador sintético local separados de Neon; credenciales de operador/ejecución distintas, consentimiento de prueba explícito y sin cuentas de arranque. Script Windows para iniciar/parar y conexión USB.
- CI Android 46096349372 aprobó 33 pruebas y APK; HTTP real 46097071717 aprobó alta/reintento/duplicado con rol limitado; backend 46097071773 aprobó 89 sin omisiones. APK descargada, ZIP y manifiesto verificados; capturas de widgets revisadas.
- Usuario autoriza instalación de Docker/WSL; elevación Windows requerida, sin reinicio automático. Documentación y Word candidatos preparados; revisión visual pendiente. Sin datos reales, sesión, aprobación, corrección de PERF01 o cierre de fase.

## 0.13 — 2026-11-27 — CAM-2026-013

- API02: registro transaccional v2 solo en pruebas sintéticas aisladas; validaciones, Argon2id, consentimiento, rol pasajera y contactos únicos.
- Reintentos con HMAC, bloqueo transaccional, TTL y reproducción de éxito anterior a nueva política; sin migración nueva o cambios en Neon.
- Errores de protocolo controlados, límite inicial por proceso y bandeja de incidentes fuera de base sin secretos. Canal de entrega administrativa pendiente.
- CI 46085546369 aprobó las 83 pruebas sin omisiones: 51 sin PostgreSQL y 32 de PostgreSQL, con REG01–REG11 y doce escenarios sintéticos. Foundation 46085546378 también aprobó. Neon conserva cero cuentas y registro cerrado.
- Estado, decisiones y guía actualizados; Word candidatos locales pendientes de render. Sin APK nueva, sesiones, datos reales o cierre de fase.

## 0.12 — 2026-11-27 — CAM-2026-012

- DB01: kora_dev creada en Neon, migración 0001_api_base y seis tablas vacías con PostGIS; neondb sin cambios de tablas.
- Rol de ejecución nuevo y conexiones de aplicación/migración separadas en .env ignorado; TLS cliente y permisos comprobados. Seguimiento: usuario informa rotación de propietario; conexión directa actual y ejecución separada verificadas. Revocación de credencial anterior no probada.
- Migración actual y sin deriva; salud preparada 200 y registro cerrado 503 en comprobaciones HTTP locales con Neon real. PostgreSQL 18.7/PostGIS 3.6.4 observados; no equivale a repetir las 28 pruebas de CI PostgreSQL 16.
- Guía, evidencia, decisiones, estado y plan actualizados. Word candidatos locales pendientes de render; sin cambios de APK, contratos o despliegue ni cierre de fase.

## 0.11 — 2026-11-27 — CAM-2026-011

- API01: base FastAPI con salud, preparación PostgreSQL/PostGIS y política/puerta de registro cerradas; sin alta o sesiones simuladas.
- Seis tablas compartidas en esquema kora y migración Alembic; unicidad de contactos, integridad y protección de versiones y recibos. Sin datos de arranque o aprobación sintética en aplicación.
- Python 3.12.16 y dependencias fijadas con uv.lock; entorno aislado y conexiones de servicio/migración sin secretos en Git.
- 13 pruebas locales aprobadas, 15 PostgreSQL omitidas por falta de servidor local. CI 46066007419 aprobó las 28 sin omisiones sobre PostGIS real, incluyendo ciclo de migración y restricciones. Compose desechable e imagen con digest fijado.
- Documentación, decisiones y estado actualizados; Word candidatos locales por fallo de render conocido. Sin cambios móviles, despliegue, conexión Neon o cierre de fase.

## 0.10 — 2026-11-26 — CAM-2026-010

- Preparado contrato v2 de política y registro con campos obligatorios, consentimiento explícito, roles seguros, errores, reintentos e idempotencia; v1 conservado con plan de migración.
- Añadidos 49 ejemplos y verificador JSON Schema 2020-12, herramientas fijadas y comprobación de CI separada del verificador inicial. No ejecutan backend ni pruebas de negocio.
- Registrada aceptación general de diseños APP02 por el usuario y tirones como PERF01 pendiente de medición; no se promete corrección automática.
- Julian se declara responsable del tratamiento; borrador de consentimiento y 12 escenarios sintéticos preparados, sin habilitar datos reales.
- Corregida sintaxis YAML del comando pip tras fallo inicial de CI; comprobación de sintaxis añadida al verificador. Ejecución 45941147338 aprobada con verificador inicial, 49 fixtures y forma de 12 escenarios, sin backend.
- Actualizados contexto, decisiones, estado y planificación. Sin cambios Flutter, SQL, conexión Neon o despliegue; consentimiento final y contactos pendientes; responsable declarado por el usuario.
- Word CAM010 preparados localmente; originales conservados hasta resolver el render e inspeccionar candidatos. Ninguna fase cerrada.

## 0.9 — 2026-11-26 — CAM-2026-009

- APP02: pantallas Flutter premium de registro, solicitud, estado y apelaciones, accesibles desde Perfil y con acento personal compartido. App 0.2.0+2.
- Validaciones locales y mensajes de RF01; motivos de apelación, dos oportunidades, una pendiente y fecha de nueva solicitud tras espera de 30 días de rechazo definitivo.
- Sin cuentas locales ficticias ni envío simulado. Estado distribuido no disponible; escenarios de revisión solo en test. Documentos y biometría sin captura, integración aplazada.
- Nueve pruebas nuevas, 20 funcionales locales y CI aprobadas; análisis limpio y APK debug 0.2.0+2 compilada en ejecución 45910392743. Descarga, estructura y hashes verificados; Android físico y backend pendientes.
- Registro documental de decisiones. Word preparados localmente, pero se preservan originales porque el render de Word no termina ni con un control de un párrafo. Contratos sin cambios y fases abiertas.

## 0.8 — 2026-11-26 — CAM-2026-008

- Documentados campos, validaciones, unicidad y mensajes acordados de RF01; teléfono normalizado con código de país y nombre visible no único.
- Primera entrega académica de registro y aprobación; biometría en segunda entrega, sin viajes operativos ni recorte del alcance final.
- Registrado reporte del usuario de funcionamiento general en Redmi Note 15 Pro con Android 16; checklist específico pendiente.
- Actualizados visión, plan, decisiones, trazabilidad, pendientes, estado y plan estructurado. Word 01/02/03 preparados localmente pero sin sustituir los vigentes: renderizador sin LibreOffice y exportación Word sin completar; inspección visual pendiente. Sin código funcional, cambios de contratos o nuevas fechas.

## 0.7 — 2026-11-24 — CAM-2026-007

- Inicializada aplicación Flutter Android, estilo premium oscuro con acento platino y navegación Inicio, Viajes y Perfil.
- Historia APP01: Apariencia con seis colores, selector RGB, vista previa, cancelación, restauración y preferencia local persistida; control de errores y escrituras serializadas.
- Separados tema, estado, repositorio y rutas. Colores semánticos fijos y ajuste de tonos oscuros para lectura.
- SDK y dependencias fijados, lock conservado y pipeline Android para análisis, pruebas y APK debug.
- Resolución directa de Material UI y formato refrescados con Dart 3.14 para reproducir las comprobaciones en Linux.
- GitHub Actions aprobó análisis, once pruebas y APK debug del commit 48033679; artefacto de desarrollo disponible, prueba física pendiente.
- Documentación y Word actualizados; sin cambios de backend o contratos. No se implementan ni simulan verificaciones, ubicación, solicitudes de viaje o alertas.

## 0.6 — 2026-11-24 — CAM-2026-006

- Creadas cinco direcciones visuales: Premium Platino, Premium Órbita, Sencilla Clara, Sencilla Paso a Paso y 3D Trayecto, según distribución elegida por el usuario.
- Añadidas cinco láminas, ilustración 3D original, prototipo navegable local, paletas, guía de interacción y prompts en Documentación/Diseno.
- Prototipo con ambos perfiles, estados de muestra, diálogos, desconexión y movimiento reducido; no implementa viajes, identidad ni alertas reales.
- Selección visual pendiente; se mantienen alcance, fechas, presupuesto y contratos. Registro Word actualizado; no se declara cerrada una fase.

## 0.5 — 2026-11-24 — CAM-2026-005

- Visión revisada para sistema completo y fecha tentativa 14/01/2027.
- Responsabilidad conjunta de backend, 30 h por persona y capacidad conservadora con reserva.
- Presupuesto de referencia del documento principal; discrepancia aritmética registrada.
- Documentación técnica, Word y contratos centralizados en Documentación; versiones anteriores archivadas sin alterar su contenido.
- Matriz de aceptación, pendientes y pasos Codex; contratos parciales sin cambios semánticos.
- No se implementan aplicaciones ni se declara una fase terminada.


## 0.4 — 2026-11-18 — CAM-2026-004

- Registrada entrega requerida antes de la segunda semana de diciembre, usuario en móvil y John Ortiz en web, aproximadamente 30 h semanales por persona.
- Propuestos objetivo interno 06/12/2026, capacidad conservadora, alcance demostrable y presupuesto operativo remoto de 300.000 COP con alternativas.
- Escenario anterior de 20 semanas conservado como antecedente; no se da por aprobado un recorte académico ni financiación.
- Actualizados plan estructurado, referencias de estado y decisiones y registro Word; añadido anexo de entrega de diciembre.

## Revisión F0 — 2026-11-18 — CAM-2026-003

- Revisión del punto de partida y clasificación de instrucciones vigentes, supuestos y pendientes en Documentación/Historial/2026-11-18/docs/DIAGNOSTICO_F0.md.
- Identificación de desactualizaciones, limitaciones del verificador y brechas del contrato para revisión posterior.
- Estado y registro de decisiones actualizados; evidencia añadida al Word de control de cambios.
- Fechas, disponibilidad, presupuesto, alcance, contratos y aplicaciones conservados. F0 no se declara terminada ni se atribuyen aprobaciones.

## 0.2 — 2026-11-18 — CAM-2026-002

- Reorientación de la planificación a Android con interfaces de pasajera y conductora, manteniendo la web administrativa paralela.
- Escenario de 20 semanas desde 23/11/2026 a 11/04/2027, disponibilidad y costos estimados, pendientes de confirmación real.
- Arquitectura, entornos y contrato de sincronización compartida; guía de tareas para Codex.
- Estructura monorepo, archivos de configuración de ejemplo y comprobación documental en CI.
- Actualización de Word de visión, plan y registro; nuevo anexo móvil.
- Köra como nombre provisional renombrable. Publicación registrada únicamente cuando se verifique GitHub.

## 0.1 — 2026-10-31 — CAM-2026-001

- Visión, plan general de 22 semanas y formato de registro de cambios iniciales.
