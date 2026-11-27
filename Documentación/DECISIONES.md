# Decisiones vigentes
24/11/2026 · CAM-2026-005. Los registros DEC01 a DEC18 anteriores se conservan íntegros en Historial/2026-11-18/docs/DECISIONES.md. Las decisiones siguientes prevalecen sobre fechas, capacidad, alcance de primera entrega y presupuestos alternativos de esos registros.

| ID | Decisión | Estado |
|---|---|---|
| DEC19 | Entrega tentativa 14/01/2027 y producto académico completo | Comunicado por el usuario; fecha institucional no acreditada. Sustituye DEC07, DEC14, DEC16 y la propuesta de alcance reducido DEC17. |
| DEC20 | Julian desarrolla Android, John web; ambos backend | Comunicado por el usuario. 30 h aproximadas por persona, 60 h de equipo; backend incluido. Actualiza DEC08 y DEC15. |
| DEC21 | Presupuesto del documento principal | Indicado por el usuario. Sustituye propuestas DEC11 y DEC18; diferencia aritmética de 20.000 COP por conciliar. |
| DEC22 | Toda la documentación técnica y planificadora en Documentación | Indicado por el usuario; Word, guías, decisiones, plan y contratos reunidos. README y AGENTS raíz sirven como entrada. |
| DEC23 | 220 h por persona, 176 previstas y 44 de reserva, fases F0 a F7 | Propuesta conservadora 24/11–14/01; esfuerzo por historias pendiente, no garantía de viabilidad. |
| DEC24 | Mantener Flutter, React, FastAPI y PostgreSQL/PostGIS, API única | Base técnica; versiones y compatibilidad se verifican al inicializar. Render recomendado, no contratado. |
| DEC25 | Cierre de fases con evidencia y revisión cruzada | Regla de trabajo; nunca sustituir vida o identidad por simulación para cumplir fecha. |

No se inventan aprobación del director, proveedores contratados, responsables institucionales de datos ni autorizaciones de piloto. Pendientes concretos en PENDIENTES.md.

## Exploración visual CAM 2026 006

| ID | Decisión | Estado |
|---|---|---|
| DEC26 | Cinco propuestas: dos premium, dos sencillas y una 3D; producir un estilo y después el siguiente | Distribución elegida por el usuario. Propuestas en Diseno; ninguna seleccionada como diseño final. |
| DEC27 | Prototipo visual local y guía con estados coherentes con la visión; movimiento opcional, sin decoración en marcha | Propuesta de interacción para revisión, no implementación de APK ni autorización simulada de viajes. No cambia los contratos ni añade motor 3D. |

Recomendación de diseño inicial: Sencilla Clara por su estructura directa, a contrastar con usuarias. No se presenta como evaluación de usabilidad ni aprobación de los autores. No cambian fecha, presupuesto o alcance funcional.

## Implementación móvil CAM 2026 007

| ID | Decisión | Estado |
|---|---|---|
| DEC28 | Estilo premium con apartado para cambiar el color de la aplicación móvil | Solicitado por el usuario. Se adapta Premium Órbita como composición de implementación; no se atribuye elección explícita de esa subvariante. Sustituye la selección abierta de DEC26. |
| DEC29 | Acento personal persistido localmente, superficies oscuras y estados semánticos fijos | APP01 implementa presets, RGB, cancelación, restauración y errores. SharedPreferencesAsync guarda solo color, sin sincronización web ni API nueva. |
| DEC30 | Flutter 3.50.1, Dart 3.14.0, Material UI oficial separado, versiones fijadas y Android API 24 mínimo | Base inicial verificable; dev.kora.kora_mobile es identificador de desarrollo, no identidad de tienda aprobada. El cierre de F2 sigue requiriendo web, API y viabilidad. |

No cambian fechas, capacidad o presupuesto. La apariencia complementa RF11 y RNF05. Registro, roles y controles de seguridad se implementarán mediante sus historias, sin datos fingidos en producción.

## Registro y entregas CAM 2026 008

26/11/2026. Decisiones comunicadas y confirmadas por el usuario durante la definición de RF01.

| ID | Decisión | Estado |
|---|---|---|
| DEC31 | Primera entrega oficial académica de registro y aprobación, sin viajes; biometría en segunda entrega | Acordado por el usuario. No elimina alcance final ni fija nuevas fechas. |
| DEC32 | Una cuenta admite pasajera y conductora; solicitud de conductora requiere revisión; administración en panel separado | Acordado. Pasajera sin aprobación rutinaria; administración sin alta pública. Procedimiento de creación administrativa y criterios pendientes. |
| DEC33 | Acceso por correo y contraseña y campos obligatorios comunes | Acordado. Edad mínima 18; contraseña de 12 caracteres con cuatro categorías; nombre repetible de hasta 100, letras con tildes y ñ, números y espacios. |
| DEC34 | Unicidad solo de correo y teléfono internacional normalizado, no de nombre de usuario | Acordado. Mismo número nacional con distinto código permitido solo si las combinaciones son válidas y distintas. |
| DEC35 | Mensajes literales y alerta administrativa por fallo interno de registro | Acordado; textos en RF01_REGISTRO.md. Canal y recuperación del aviso pendientes; diagnóstico sin secretos ni formulario completo. |
| DEC36 | Prueba física de la primera APK reportada como correcta por el usuario | Redmi Note 15 Pro con Android 16. No hay checklist, capturas ni evidencia específica de TalkBack, persistencia tras cierre o rendimiento; no se declara aceptación completa. |

Los contratos no se modifican en CAM-2026-008. El registro y el panel siguen sin implementar. La verificación biométrica se destina a identidad, no a inferir género; elegibilidad y tratamiento de datos quedan pendientes de revisión.

## Pantallas y apelaciones CAM 2026 009

26/11/2026.

| ID | Decisión | Estado |
|---|---|---|
| DEC37 | Primera entrega para Colombia y automóviles; campos documentales de conductora obligatorios con integración aplazada | Acordado por el usuario. APP02 muestra requisitos sin capturar documentos. |
| DEC38 | Dos apelaciones por solicitud, una pendiente, motivos obligatorios de solicitante y administración | Acordado. Correcciones separadas; historial y reintentos sin duplicados requieren backend. |
| DEC39 | Esperar 30 días para nueva solicitud después del rechazo definitivo | Acordado. Se aplica al cierre rechazado de la segunda apelación; 30 × 24 h UTC como propuesta técnica. La cuenta de pasajera se conserva; servidor confirma fecha y autorización. |
| DEC40 | Pantallas premium nativas de registro, solicitud, estado y apelaciones | Solicitadas por el usuario. APP02 implementa interfaz y validaciones locales, sin altas o decisiones ficticias; estados sintéticos solo en test. Contratos sin cambios. |

Se mantienen fecha tentativa final, horas y presupuesto. Las pantallas no acreditan RF01/RF02 completos ni cierre de fase. Los Word de CAM008 y CAM009 están preparados localmente pero siguen pendientes de render: incluso el documento de control de un párrafo no completa la exportación Word en este equipo.

## Contrato de registro CAM 2026 010

26/11/2026. Historia acotada de contrato RF01, sin implementar servicio.

| ID | Decisión | Estado |
|---|---|---|
| DEC41 | Registro v2 con política, datos completos y consentimiento explícito, conservando contrato inicial v1 | Decisión técnica por cambio incompatible de esquema; migración documentada. No hay API desplegada ni cuentas que migrar. |
| DEC42 | UUID común; alta con pasajera, requested_role como intención, sin sesión ni aprobación de conductora | Decisión técnica que preserva la revisión y una sola identidad. Backend y clientes HTTP pendientes. |
| DEC43 | Unicidad de correo normalizado y teléfono E.164; clave de idempotencia y recibo transaccional | Reglas técnicas para implementar y probar en base real. TTL de 24 h y cuerpo de 16 KiB propuestos; no atribuir nueva aprobación explícita del usuario. |
| DEC44 | Consentimiento vigente aprobado antes de habilitar registro real | Contenido, responsable y contacto pendientes; solo datos sintéticos para pruebas mientras se definen. No inventar consentimiento ni autorización institucional. |
| DEC45 | Usuario revisó APP02 y reporta pantallas correctas con tirones | Evidencia declarada en PRUEBA_APP02.md. PERF01 abierto, pendiente de diagnóstico en profile; no prometer que desaparezca al completar funciones. |

No cambian presupuesto, horas, entrega tentativa ni reglas de dos apelaciones/30 días. La verificación de esquemas no demuestra persistencia o registro funcional. Los Word de esta revisión se preparan localmente sobre los candidatos anteriores; el fallo de render ya documentado impide sustituirlos sin inspección.

## Responsable y datos de prueba de CAM 2026 010

DEC46. El usuario declara que Julian Hernando Perez Villamizar será responsable del tratamiento y solicita ayuda para preparar el contrato y datos sintéticos. Se registra como declaración del usuario, sin atribuir aval institucional. Contacto y texto final aprobado siguen pendientes. Borrador en CONSENTIMIENTO_CUENTA_BORRADOR.md; pruebas en DATOS_PRUEBA_REGISTRO.md. El registro real no se habilita por esta declaración.

Se preparan 12 escenarios sintéticos adicionales a los 49 ejemplos de esquema. No hay importación de cuentas, notificaciones externas o ejecución contra Neon. El workflow corrige el comando pip en YAML multilínea y el verificador comprueba la sintaxis para evitar repetir ese error; la primera ejecución fallida no se presenta como validación aprobada.

## Base API01 CAM 2026 011

27/11/2026. Implementación asistida para Julian; revisión cruzada de John pendiente, sin atribuir aprobación o cierre de fase.

| ID | Decisión | Estado |
|---|---|---|
| DEC47 | Inicializar FastAPI, PostgreSQL/PostGIS y Alembic como historia API01 | Solicitado por el usuario. Criterio: proceso activo, preparación real de base y migración reproducible, con registro cerrado. No incluye alta, sesión o aprobación funcional. |
| DEC48 | Python 3.12.16 y dependencias estables fijadas con uv 0.13.9 y uv.lock | Entorno backend aislado, creado con Python administrado por uv. Versiones en BASE_API.md. |
| DEC49 | Seis tablas en esquema kora y public.kora_alembic_version; sin cuentas o consentimiento aprobados al migrar | Cuenta única entre clientes, contactos únicos, nombre repetible y recibos protegidos. No se dan por implementados hash criptográfico, edad, numeración completa o idempotencia de negocio. |
| DEC50 | PostgreSQL 16/PostGIS 3.7 con digest fijado para pruebas desechables | Rama 16-3.7 vigente en proveedor; las anteriores 3.5/3.6 dejaron de actualizarse. Sin actualización de volúmenes existentes o de Neon. |
| DEC51 | Pruebas de persistencia en GitHub Actions por falta de Docker/PostgreSQL local | No se usa la credencial expuesta ni se conecta Neon. Las pruebas locales omiten integración con motivo; CI debe demostrarla antes de declararla validada. |

La política de API01 siempre está deshabilitada y el POST rechaza sin crear cuentas. No hay variable para abrirlo antes de implementar el alta y aprobar el tratamiento. Se mantienen dos apelaciones y 30 días bajo servidor para sus historias posteriores, además de presupuesto, horas y fecha final tentativa. Word candidatos preparados localmente; el bloqueo conocido de render sigue pendiente.

## Preparación Neon CAM 2026 012

| ID | Decisión | Estado |
|---|---|---|
| DEC52 | Crear kora_dev como base separada en la rama existente de Neon | Ejecutado por solicitud de preparar desarrollo. No es rama o proyecto separado; sin cambio de tablas en neondb ni contratación nueva. |
| DEC53 | Usar rol kora_app_dev por pooler y propietario por conexión directa para migraciones | Ejecutado, TLS cliente verificado. Rol nuevo sin privilegios elevados ni CREATE en kora; catálogo de consentimiento y revisión Alembic de solo lectura. Contraseña propietaria expuesta aún pendiente de rotación por Julian. |
| DEC54 | Conservar PostgreSQL 16/PostGIS 3.7 de CI y registrar PostgreSQL 18.7/PostGIS 3.6.4 de Neon | Migración, deriva y salud verificadas en Neon; no declarar la suite completa probada en PostgreSQL 18. Sin descenso ni limpieza destructiva en Neon. |

DB01_EVIDENCIA_NEON.json registra los resultados sin secretos. Registro real, fases, revisión humana y Word siguen pendientes según NEON_DESARROLLO.md. No se modifican contratos, fechas o presupuesto.
