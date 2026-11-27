# Datos sintéticos para probar el registro

26/11/2026 · CAM-2026-010. Preparados por solicitud de Julian. No se han creado cuentas ni enviado solicitudes a Neon, a una API o a servicios de mensajería.

## Archivos y uso

- [49 casos de esquema](Contratos/examples/registration-v2-cases.json): solicitudes y respuestas válidas e inválidas para comprobar el contrato.
- [12 escenarios sintéticos](Contratos/examples/registration-v2-test-data.json): cuerpos de registro, claves de idempotencia, dependencias entre escenarios y resultados esperados para futuras pruebas de integración.
- [Contrato técnico](CONTRATO_REGISTRO.md): explica las reglas que debe ejecutar el servidor.

Los nombres y fechas son ficticios; los correos terminan en .invalid. La contraseña conocida de los ejemplos solo sirve para pruebas y no debe usarse en cuentas reales. Los números son generados para probar estructuras, sin comprobar titularidad o asignación: no se debe llamar ni enviar SMS. No hay cédulas, rostros, biometría o ubicaciones.

El archivo está marcado environment=test-only y allow_external_notifications=false. El futuro cargador o suite debe exigir entorno de pruebas, base separada del piloto y canales externos desactivados. Estos indicadores son requisitos para el cargador futuro, no protecciones ejecutables por sí solos. No importar el archivo en producción ni añadir cuentas de ejemplo a la aplicación distribuida.

## Escenarios preparados

| ID | Propósito |
|---|---|
| SYN01 | Crear una pasajera ficticia con consentimiento de prueba. |
| SYN02 | Permitir el mismo nombre visible con correo y teléfono distintos. |
| SYN03 | Rechazar correo repetido con distinta capitalización después de SYN01. |
| SYN04 | Detectar el mismo teléfono con espacios y guiones. |
| SYN05 | Rechazar consentimiento no aceptado. |
| SYN06 | Rechazar menor de 18 según la fecha fija de referencia. |
| SYN07 | Registrar intención de conducir sin conceder habilitación o rol administrativo. |
| SYN08 | Repetir el mismo envío con igual clave sin crear otra cuenta. |
| SYN09 | Rechazar reutilización de clave con contenido diferente. |
| SYN10 | Rechazar intento de introducir roles administrativos. |
| SYN11 | Rechazar fecha de nacimiento futura. |
| SYN12 | Distinguir números internacionales con el mismo número nacional, sujeto a que ambas combinaciones superen la validación de numeración. |

La referencia server_date de estos datos es 2026-11-26. Inyectar esa fecha en pruebas temporales, sin alterar el reloj del sistema ni usarla en producción. Cambiar el calendario del teléfono no cambia la regla del servidor. SYN12 no acredita números válidos por país: esa comprobación sigue pendiente de la biblioteca que se seleccione para backend.

## Estado de comprobación

El verificador comprueba las formas de los 49 ejemplos y de los 12 escenarios, así como sus marcas de prueba. No ejecuta sus resultados HTTP esperados. Todos los escenarios de servidor conservan server_test_status=pending_backend. No se presentan como pruebas de negocio aprobadas hasta implementar y probar API, migraciones, base e incidentes.

El consentimiento test-account-consent-v1 es sintético y no corresponde a una autorización de participantes. El [borrador de consentimiento](CONSENTIMIENTO_CUENTA_BORRADOR.md) se revisa por separado; el registro con personas reales sigue deshabilitado mientras falten texto aprobado, contactos y condiciones operativas.
