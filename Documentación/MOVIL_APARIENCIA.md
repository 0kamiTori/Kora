# Aplicación móvil premium y color personal

Historia APP01 · CAM-2026-007 · 24/11/2026.

El usuario eligió el estilo premium y solicitó cambiar el color desde la aplicación móvil. La composición de Premium Órbita se toma como base de implementación, con superficies oscuras y detalles platinados. Los colores personalizados afectan a acentos, selección y acciones; no modifican el significado de errores, ayuda o verificación.

## Alcance verificable de APP01

| Criterio | Comportamiento esperado |
|---|---|
| Entrada | Perfil → Apariencia; acceso adicional mediante paleta en Inicio |
| Premium | Fondo grafito, superficies oscuras, textura urbana abstracta, navegación inferior y acento platino por defecto |
| Colección | Platino, Zafiro, Jade, Amatista, Cobre y Rosa se aplican en toda la interfaz |
| Personalizar | Selector RGB con vista previa; Guardar mi color confirma y Cancelar conserva el anterior |
| Persistencia | Al volver a abrir, recuperar la preferencia local; valor ausente o inválido utiliza platino |
| Restaurar | Volver al platino actualiza la interfaz y la preferencia persistida |
| Fallos | Si falla lectura, abrir con platino y aviso; si falla escritura, recuperar último color guardado y permitir reintentar |
| Concurrencia | Serializar elecciones rápidas para que la última sea la persistida |
| Lectura | Aclarar acentos demasiado oscuros; elegir texto negro o blanco según contraste calculado; probar tamaño de texto aumentado |
| Estados | No mostrar identidad aprobada, viajes, ubicaciones o alertas inventados |

## Implementación

Código en apps/mobile. Flutter 3.50.1 estable, Dart 3.14.0, material_ui 1.11.1, flutter_riverpod 3.5.0, go_router 18.1.4 y shared_preferences 2.5.6; versiones directas fijadas y pubspec.lock conservado. Android mínimo API 24. Identificador provisional de desarrollo dev.kora.kora_mobile; revisar antes de publicación en tienda.

La biblioteca oficial material_ui sigue la separación de Material del SDK en Flutter 3.50. Estado de apariencia en controlador Riverpod, rutas en GoRouter y persistencia detrás de AppearanceRepository. SharedPreferencesAsync solo guarda el entero del color bajo kora.appearance.accent.v1; no guarda cuentas, tokens, rostros o ubicaciones y no se utiliza como base de datos de seguridad. Preferencia local, sin sincronización con web ni API nueva.

La interfaz de Inicio, Viajes y Perfil sirve de base móvil. La textura del inicio es decorativa, sin coordenadas ni posición GPS. Planear un viaje explica la etapa pendiente; no solicita ni autoriza un servicio. Registro, roles, biometría, seguimiento y alertas requieren sus historias e integración real con el backend común. APP01 no acredita RF01–RF13 ni el cierre de F2.

## Ejecutar y comprobar

Desde apps/mobile con Flutter 3.50.1 disponible:

```powershell
flutter pub get --enforce-lockfile
dart format --output=none --set-exit-if-changed lib test
flutter analyze --fatal-infos
flutter test --reporter expanded
flutter run -d ID_DEL_DISPOSITIVO
```

Para ejecutar en Android hace falta Android SDK, sus licencias y un teléfono con depuración USB o emulador. JDK 21 es la referencia del pipeline Android. El SDK Flutter preparado para esta sesión vive fuera del repositorio; cada integrante puede instalarlo en su propia ubicación. No se versionan rutas locales, cachés ni SDK.

El workflow mobile.yml analiza, prueba y compila una APK debug en GitHub Actions. La APK se conserva como artefacto kora-android-debug por 14 días; es una compilación de desarrollo, no una publicación en tienda ni una versión firmada para producción. La firma de distribución deberá configurarse fuera de Git y la compilación release no usa automáticamente la clave debug.

Primera compilación aprobada: [ejecución 45472492695](https://github.com/0kamiTori/Kora/actions/runs/45472492695), commit 48033679a135fa27752217ab6841a2103cc70e0a. [Artefacto APK debug](https://github.com/0kamiTori/Kora/actions/runs/45472492695/artifacts/14958721383). Descargar el ZIP y extraer app-debug.apk para probarlo en el teléfono. Si Android solicita permiso de instalación, habilitarlo para la aplicación desde la que abres este archivo. Integridad de ZIP y APK verificada; [procedencia y hashes](Diseno/ImplementacionAPP01/apk-provenance.json).

## Comprobaciones y límites

Análisis estático sin incidencias y doce pruebas locales aprobadas, incluida captura visual. Las pruebas de controlador comprueban persistencia mediante repositorio de prueba, fallos, orden de escrituras y contraste; las de widgets comprueban navegación, color global, selector, cancelación, restauración y textos grandes. Los dobles solo viven en test. Capturas opcionales mediante KORA_CAPTURE_DIR, KORA_CAPTURE_FONT y KORA_CAPTURE_ICONS; fuentes oficiales del SDK cargadas solo para revisar el renderizado. En CI la captura se omite: once pruebas funcionales.

Capturas de [Inicio](Diseno/ImplementacionAPP01/inicio.png), [Apariencia platino](Diseno/ImplementacionAPP01/apariencia-platino.png), [Apariencia Jade](Diseno/ImplementacionAPP01/apariencia-jade.png) y [selector personal](Diseno/ImplementacionAPP01/color-personal.png). Son renderizados de widgets Flutter a 390 × 844, no capturas de un teléfono ni evidencia de integración Android.

Pendiente en dispositivo físico: persistencia del plugin Android tras cierre, renderizado de la tipografía, contraste bajo luz ambiental, TalkBack y escalado de texto del sistema. El contraste numérico de colores aislados no acredita accesibilidad de toda la aplicación. No hay evaluación de seguridad de viajes en esta historia.

Dispositivo de referencia comunicado por el usuario: Xiaomi Redmi Note 15 Pro con Android 16. Es información aportada para preparar las pruebas, no una ejecución verificada. Comprobar instalación de la APK debug, selección y recuperación del color tras cierre completo, navegación atrás, texto aumentado y reducción de animaciones. No requiere cámara, ubicación ni datos reales para APP01.

## Fuentes oficiales consultadas

- [Flutter estable](https://docs.flutter.dev/install/archive).
- [Separación de Material en Flutter 3.50](https://docs.flutter.dev/release/breaking-changes/material-ui-and-cupertino-ui).
- [material_ui](https://pub.dev/packages/material_ui).
- [Shared preferences y APIs asíncronas](https://pub.dev/packages/shared_preferences).
- [Riverpod](https://pub.dev/packages/flutter_riverpod) y [GoRouter](https://pub.dev/packages/go_router).
