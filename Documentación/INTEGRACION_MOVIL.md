# Integración del registro móvil con la API

27/11/2026 · APP03 · CAM-2026-014 · Android 0.3.0+3. Implementación asistida para Julian; revisión de John pendiente. Esta historia conecta el formulario al backend compartido para pruebas sintéticas. No incluye inicio de sesión, aprobación, viajes, datos reales o cierre de fase.

## Qué cambia en el teléfono

La app consulta GET /api/v2/registration-policy, muestra el consentimiento recibido y mantiene la casilla desmarcada. El formulario envía POST /api/v2/accounts con fecha civil, código internacional, intención de perfil y consentimiento versionado. Solo un 201 con confirmación válida muestra Cuenta creada. No emite o guarda una sesión, ni habilita automáticamente a la conductora.

Dio 5.11.1 está fijado en pubspec y lock, sin registro de cuerpos ni redirecciones automáticas. Se traducen códigos y errores por campo a textos conocidos; no se muestra el mensaje arbitrario del servidor o una excepción HTTP con formulario. La cuenta, el consentimiento y las decisiones siguen perteneciendo al backend.

La doble pulsación no duplica operaciones. Un resultado incierto conserva UUID y cuerpo exactos en memoria y bloquea la edición; el reintento usa esa misma clave antes de volver a consultar políticas. Se respeta Retry-After. Si cambia el consentimiento se muestra su nuevo texto y se desmarca la aceptación. Un error de validación permite corregir el formulario y crear otro envío lógico; un conflicto de idempotencia no genera automáticamente otra clave.

Los campos y el envío pendiente no se guardan en disco. La contraseña se limpia al confirmar y el controlador se destruye al salir. Si se abandona la pantalla o muere el proceso antes de confirmar, se pierde la posibilidad de reanudar ese envío desde el teléfono; esto no prueba que la cuenta no exista. La interfaz advierte de ese límite y no inventa un fracaso o éxito. Acceso y recuperación siguen pendientes.

## Entorno aislado

El archivo local de integración es services/api/.local/integration/connection.env, generado por kora_api.integration init con contraseñas aleatorias y HMAC estable entre arranques. No sustituye services/api/.env de Neon. Los archivos de configuración, incidentes y logs locales quedan excluidos de Git y de entregas.

| Componente | Configuración |
|---|---|
| Base local | PostgreSQL 16/PostGIS 3.7, contenedor con digest ya fijado en el proyecto; kora_test_mobile, puerto 55433 solo en 127.0.0.1. |
| Migraciones | kora_test_mobile_operator; conexión local validada antes de aplicar DDL. |
| API | Credencial separada kora_test_mobile_app, sin CREATE o privilegios elevados; catálogo de consentimiento y revisión Alembic de solo lectura. |
| Política | test-mobile-account-v1, texto explícitamente ficticio insertado solo por el preparador aislado. No se crean cuentas de arranque. |
| HTTP | API nativa en 127.0.0.1:8000; el teléfono accede mediante adb reverse por USB. |
| Volumen | Persistencia local de datos sintéticos; Stop conserva volumen y configuración. No hay borrado o downgrade automático. |

El preparador rechaza otra base, host, puerto, roles, entorno o versión de consentimiento antes de migrar. La configuración explícita tiene prioridad sobre variables de Neon del proceso. El modo API02 exige APP_ENV=test, PostgreSQL local kora_test_* y correos .invalid. No se debilita esa guarda para conectar Neon o desplegar un piloto.

## Preparar Windows

Se detectó Windows 11 Home, virtualización habilitada en firmware, sin Docker o WSL operativos ni SDK Android local. A petición del usuario se intenta instalar Docker Desktop y WSL desde fuentes oficiales. La primera instalación de WSL fue rechazada por falta de permisos administrativos; su instalación elevada y eventual reinicio se registrarán según el resultado real. No presentar una descarga como instalación o motor disponible, ni reiniciar automáticamente.

Necesitas Docker Desktop con backend WSL 2 operativo y Android SDK Platform Tools (adb). No necesitas contratar servicios o abrir el puerto de PostgreSQL a la red. El consentimiento de participantes sigue pendiente y este entorno admite solo datos ficticios.

Desde la raíz del repositorio, en PowerShell:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File scripts/integration.ps1 -Action Init
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File scripts/integration.ps1 -Action Start
```

La opción de ejecución se limita al proceso que ejecuta este script local; no modifica la política global de Windows. Init genera o conserva configuración; Start inicia la base, migra, prepara el consentimiento de prueba y arranca la API en segundo plano. No detiene un proceso ajeno si el puerto 8000 está ocupado. Su PID y hora de inicio se conservan para detener únicamente el proceso creado por el script.

Comprobaciones:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File scripts/integration.ps1 -Action Status
```

Status comprueba la base configurada; verificar además que http://127.0.0.1:8000/health/ready responde ready y que /api/v2/registration-policy ofrece test-mobile-account-v1. No copiar el archivo de conexiones a capturas, ZIP o chat.

## Conectar el Redmi por USB

1. Instala la APK Köra pruebas. Su identificador debug es dev.kora.kora_mobile.integration, distinto del de entregas anteriores: puede coexistir con ellas y no migra su color local. Se genera con certificado debug, no con firma de distribución estable.
2. Activa opciones de desarrollador y depuración USB en el Redmi, conecta un cable de datos y acepta en el teléfono la autorización de este computador. La aceptación en el teléfono requiere tu intervención.
3. Con adb disponible en PATH, ejecuta:

```powershell
rtk proxy adb devices
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File scripts/integration.ps1 -Action Usb
```

4. Mantén abierto Docker Desktop, la API y el cable conectado. En Köra pruebas abre Perfil → Crear mi cuenta. El registro habilitado debe mostrar el texto ficticio completo del servidor.
5. Usa, por ejemplo, registro01@kora.example.invalid, PruebaMovil2026!, María Prueba, 01/01/2000, +57 y 3015550100. Son valores sintéticos: no enviar SMS o llamadas y no usar esa contraseña en cuentas reales. Acepta explícitamente el texto y envía.
6. Comprueba Cuenta creada; volver a usar los mismos contactos con otra clave debe indicar que no están disponibles. Cambia correo y número válido para crear otra cuenta. Elegir Quiero conducir no debe conceder aprobación.
7. Para probar desconexión, interrumpe el enlace o detén la API durante un envío. Debe mostrar estado incierto y permitir el mismo envío al restablecerse, sin una segunda cuenta. No cambiar datos o clave durante ese reintento. Anota pantalla, versión y resultado sin datos reales.

Un teléfono que aparece unauthorized en adb necesita autorizarse en su pantalla. Si hay varios dispositivos, elegir explícitamente el destino con adb -s antes de configurar la conexión. No abrir puertos de la LAN para suplir un cable o una autorización ausentes.

## Construcción y parada

Desde apps/mobile, con Flutter 3.50.1 y SDK Android:

```powershell
rtk proxy flutter pub get --enforce-lockfile
rtk proxy flutter build apk --debug --dart-define=KORA_API_BASE_URL=http://127.0.0.1:8000/api/v2 --dart-define=KORA_SYNTHETIC_INTEGRATION=true
```

La APK debug permite HTTP exclusivamente a localhost/127.0.0.1. El código rechaza credenciales, query o fragmento en la URL, HTTP remoto y modo sintético en release. Fuera del debug de integración se exige HTTPS; sin URL configurada, el formulario permanece cerrado. Las conexiones PostgreSQL nunca se incluyen en la APK.

Desde la raíz, para parar:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File scripts/integration.ps1 -Action Stop
```

No usar down --volumes ni borrar connection.env como paso habitual: se perderían cuentas sintéticas o credenciales de la base existente. Cualquier limpieza se debe decidir separadamente sobre el entorno local identificado.

## Evidencia y pendientes

Pruebas locales: 33 funcionales Flutter aprobadas, con dos capturas opcionales omitidas; análisis inicial sin incidencias. Backend: 57 aprobadas y 32 PostgreSQL omitidas por falta de servidor local. CI debe comprobar las 89, la compilación Android y la comunicación real del transporte Dart/Dio con FastAPI y PostgreSQL. Esas evidencias se registrarán después de ejecutarse, separadas de prueba física en Redmi.

El workflow Mobile API integration usa el mismo preparador/Compose y ejecuta tool/registration_http_smoke.dart sobre HTTP real: alta, mismo UUID en reintento y contacto duplicado rechazado. No sustituye la APK física, prueba de red Android o aceptación del usuario. Neon permanece cerrado, sin cuentas sintéticas importadas. PERF01, acceso, aprobación, canal real de incidentes y consentimiento definitivo siguen pendientes. Word CAM014 preparados localmente, sujetos al render e inspección ya requeridos.

Referencias: [Dio](https://pub.dev/packages/dio/versions/5.11.1), [ADB y servidor local](https://developer.android.com/develop/ui/views/layout/webapps/access-local-server), [seguridad de red Android](https://developer.android.com/privacy-and-security/security-config), [Docker en Windows](https://docs.docker.com/desktop/setup/install/windows-install/), [instalar WSL](https://learn.microsoft.com/en-us/windows/wsl/install).
