# Guía para desarrollar el proyecto con Codex

**Prioridad vigente:** leer primero [ENTREGA_DICIEMBRE.md](ENTREGA_DICIEMBRE.md). El usuario requiere presentar antes de la segunda semana de diciembre; John Ortiz hace web y el usuario móvil, 30 h semanales aproximadamente cada uno. Priorizar requisitos e integración de la entrega acordada; la secuencia completa siguiente es la hoja de ruta del producto y no una promesa de finalización total en diciembre.

## Punto de partida

Abrir este repositorio como proyecto. Leer AGENTS.md y docs/ESTADO.md. Las carpetas actuales describen el trabajo pendiente; todavía no existe una app ejecutable. El primer objetivo es una base reproducible con autenticación y un flujo compartido, antes de integrar GPS o biometría.

## Secuencia de tareas

1. Confirmar capacidad y fecha académica; revisar alcance y completar SRS para RF01 a RF13, flujos de error y aceptación. Resolver la detección de vida en una prueba de viabilidad separada.
2. Inventariar Flutter, Android SDK, Java, Node, Python y Docker. Instalar solo faltantes desde fuentes oficiales, fijar versiones y dejar un dispositivo físico disponible. No confundir el Python integrado de Codex para documentos con el entorno del backend.
3. Crear la base Flutter real en apps/mobile, React TypeScript en apps/admin-web y FastAPI en services/api. Evitar proyectos anidados duplicados. Añadir manifests, locks y comandos reales al README de cada componente.
4. Configurar PostgreSQL/PostGIS local, Alembic y /health. Mantener .env local y .env.example ficticio. Probar que móvil y web alcanzan la misma API. En emulador Android, el equipo anfitrión suele ser 10.0.2.2; un teléfono físico necesita la dirección LAN o un entorno HTTPS accesible. No usar localhost del teléfono como dirección del PC.
5. Implementar registro, sesión, consentimiento y permisos por rol. La administración aprueba conductoras; un selector de perfil en Flutter no concede privilegios.
6. Implementar estados de viaje y consultar un mismo viaje desde móvil y web. Añadir conflictos de versión, idempotencia y autorización por recurso antes de eventos en tiempo real.
7. Implementar captura de referencia, verificación uno a uno y detección de vida evaluada. Los resultados simulados se usan solo en pruebas. No marcar identidad verificada si el servicio no está disponible.
8. Añadir mapas y GPS, permisos Android, servicio de ubicación y cola offline. Probar pantalla apagada, batería, permisos revocados y posiciones atrasadas en dos teléfonos.
9. Implementar anomalías, eventos persistidos, recuperación REST, socket y alertas con acuse. Integrar cada historia con el navegador y documentar fallos.
10. Preparar integración cloud después de medir recursos, probar copia y restauración, ejecutar el piloto controlado y generar APK firmada. La clave de firma permanece fuera de Git.

## Solicitudes concretas que puedes dar a Codex

### Primera tarea de análisis

"Lee AGENTS.md y el plan móvil. Completa el SRS de registro, roles, consentimiento y estados de viaje con criterios verificables. Señala decisiones que faltan, actualiza la matriz de trazabilidad y el registro de cambios. No marques requisitos como implementados."

### Primera tarea de implementación

"Revisa los SDK y el estado de Git. Crea una rama codex/base-compartida e inicializa Flutter, React TypeScript y FastAPI en las carpetas previstas, usando versiones estables compatibles y conservando locks. Añade /health, configuración local por entorno y pruebas de acceso a la misma API desde los dos clientes. Actualiza instrucciones y documenta lo que no puedas ejecutar. No añadas biometría ni declare el producto terminado."

### Una historia móvil

"Implementa la historia de [función] en apps/mobile según el RF y contrato indicados. Cubre permisos, carga, error y desconexión aplicables. Usa repositorios y modelos; cambia el backend solo si hace falta para esa historia. Ejecuta las pruebas adecuadas, revisa el diff y actualiza ESTADO, CHANGELOG y el Word de cambios."

### Una historia web paralela

"Implementa [vista] en apps/admin-web usando contracts/openapi.json y el mismo entorno API de móvil. Respeta IDs, estados, permisos y errores acordados. Si falta un endpoint, documenta la dependencia y usa un fixture sintético identificado. No crees una base de datos alternativa."

### Verificación de integración

"Ejecuta el escenario de aceptación de docs/SINCRONIZACION.md con móvil y web, incluyendo reconexión, duplicados y viaje ajeno. Registra esperado, observado y evidencia. No atribuyas éxito a pruebas que no se hayan podido ejecutar."

## Cómo trabajar sin perder el avance

- Una historia por chat y rama. Si hay dos chats, asignar uno a apps/mobile y otro a apps/admin-web; coordinar los cambios de contracts y services/api antes de integrarlos.
- Comenzar cada tarea revisando git status y docs/ESTADO.md. Cerrar con archivos cambiados, comprobaciones, limitaciones y siguiente tarea.
- Mantener main como versión integrada; usar PR y revisión del otro integrante cuando esté disponible. Evitar modificar el mismo contrato desde dos ramas simultáneamente.
- Mantener docs/project-plan.json y el plan escrito sincronizados al cambiar fechas, dedicación o costos. No dar por aprobados los supuestos del plan.
- Añadir CI real de Flutter, web y API cuando existan esos proyectos. El workflow inicial de este repositorio comprueba la documentación y estructura de contratos solamente.
- Registrar versiones de modelos y umbrales; no entrenar con los mismos datos que se usan para la evaluación final.

## Cierre de una fase

Comparar los criterios del plan con las evidencias. Resolver defectos críticos, ejecutar regresión afectada, documentar cambios y crear una etiqueta. La siguiente fase comienza con los contratos y requisitos revisados. Una corrección posterior puede reabrir una fase; no se intenta evitar todo error mediante un proceso irreversible.
