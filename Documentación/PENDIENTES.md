# Decisiones pendientes y recomendaciones
24/11/2026. Los responsables de coordinación son Julian y John; donde se requiere director, institución o responsable de datos, se debe obtener su revisión real.

| ID | Decisión | Recomendación y evidencia | Momento límite |
|---|---|---|---|
| P01 | Fecha académica oficial | Conservar 14/01/2027 como tentativa; adjuntar comunicación institucional si se confirma. Ambos coordinan con director. | Antes de comprometer entrega oficial |
| P02 | Viabilidad y ausencias | Estimar historias RF01–RF13 y comparar con 352 h de equipo; confirmar vacaciones, festivos y dispositivos. | F1 y revisión semanal |
| P03 | Contratos completos | Completar SRS y brechas de API; responsable y revisor por historia. | Antes de cada implementación dependiente |
| P04 | Detección de vida | Ensayar solución real, licencias, ataques, latencia y costo; OpenCV es candidato de comparación, no solución de vida aprobada. | Puerta F2 antes de aceptar RF04 |
| P05 | Identidad y datos | Definir responsable de tratamiento, consentimiento, retención por dato, retiro, eliminación y acceso administrativo; revisión institucional correspondiente. | Antes de captar datos personales o biométricos |
| P06 | Alertas y atención | Nombrar destinatario, horarios de pruebas, acuse, escalamiento y alternativa sin red; no prometer vigilancia permanente. | Antes de probar alertas con participantes |
| P07 | Protocolo de evaluación | Acordar muestras, ataques, recorridos, métricas, intervalos y autorización del piloto. Sin suficientes casos no certificar FAR/FRR. | Antes de F6 y capturas de evaluación |
| P08 | Infraestructura | Medir recursos y confirmar región, cuotas, recuperación y cobertura de presupuesto antes de activar Render u otro proveedor. | Antes del primer despliegue |
| P09 | Conciliación del presupuesto | Revisar diferencia de 20.000 COP con fuente; conservar montos declarados hasta tramitar corrección. | Antes de aprobación financiera |
| P10 | Distribución Android | Elegir applicationId, Android mínimo y dispositivos soportados; custodiar firma fuera de Git. | F2 y antes de firmar entrega |
| P11 | Validación visual en Android | Premium y color configurable elegidos por el usuario. Revisar la base Órbita, probar contraste, TalkBack y persistencia en teléfono; ampliar los flujos faltantes. Julian y John revisan. | Antes de aceptar interfaz final y distribución |

Estos puntos permiten iniciar análisis y base técnica con datos sintéticos. No equivalen a autorización para recopilar datos reales o realizar el piloto.

## Pendientes del registro y aprobación

26/11/2026 · CAM-2026-008. Confirmados: correo y contraseña, campos compartidos, 18 años cumplidos, nombre no único con tildes/ñ/números/espacios, correo y teléfono internacional únicos y mensajes de RF01. No volver a tratarlos como decisiones abiertas.

Resolver los detalles listados en [RF01_REGISTRO.md](RF01_REGISTRO.md), en especial solicitud/documentos de conductora, revisión administrativa, creación controlada de administradores, consentimiento, canal de incidentes y contrato. La biometría pasa a segunda entrega; P04 sigue pendiente antes de aceptar RF04 y no se autoriza captura real por este acuerdo. La prueba general Android reportada por el usuario no cierra P11 sin sus comprobaciones específicas.

## Actualización de pendientes APP02

Confirmados: Colombia, automóviles, campos documentales obligatorios con integración posterior, estados de revisión, dos apelaciones con motivos y una pendiente, nueva solicitud tras 30 días de rechazo definitivo. Pendientes: contrato y aplicación del plazo en backend, historial, administración y evidencia de entrega. Definir criterios documentales y política de elegibilidad sin inferencia facial de género. El reloj local no autoriza el reingreso. Validación física de APP02 y sincronización Word aún pendientes.

## Contrato y reporte físico CAM 2026 010

El contrato de alta v2 y la política están preparados y se comprueban con 49 ejemplos de esquema. Falta revisión de autores, texto de consentimiento aprobado/responsable/contacto y ejecución de los casos REG01–REG11 en backend y base de pruebas. Las decisiones técnicas de normalización y reintentos están en [CONTRATO_REGISTRO.md](CONTRATO_REGISTRO.md); v1 no se altera ni se presume implementado.

PERF01: el usuario reporta APP02 correcto con tirones. Registrar acción y pantalla, medir en dispositivo físico y modo profile, diagnosticar y volver a probar. No se asume corrección automática al finalizar funciones. Checklist de accesibilidad y persistencia sigue pendiente. El bloqueo conocido de render Word continúa sin cambio externo informado.

## Consentimiento tras declaración del responsable

Responsable declarado: Julian Hernando Perez Villamizar, por indicación del usuario; no volver a pedir su nombre como si no estuviera definido. Completar contacto del proyecto, conservación y eliminación, proveedores/regiones y canal de derechos; revisar y aprobar el borrador antes de personas reales. Los 12 escenarios de datos sintéticos ya están preparados y su ejecución funcional sigue pendiente de backend. [Borrador](CONSENTIMIENTO_CUENTA_BORRADOR.md) y [guía de pruebas](DATOS_PRUEBA_REGISTRO.md).
