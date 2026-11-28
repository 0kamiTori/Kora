# Köra

Base Neon de desarrollo preparada: [guía DB01](Documentación/NEON_DESARROLLO.md). Conexión y migración verificadas, registro todavía cerrado.
Sistema académico de movilidad segura para mujeres: aplicación Android con perfiles de pasajera y conductora, web administrativa y backend compartido. Repositorio [0kamiTori/Kora](https://github.com/0kamiTori/Kora).

**Estado al 27/11/2026:** Flutter Android premium con APP03 de registro HTTP en entorno sintético; FastAPI compartida con alta transaccional y Neon migrado a 0002, manteniendo cerrado el registro real. CI verificó cliente/API/PostgreSQL y APK; ejecución local pendiente de VirtualMachinePlatform/WSL/Docker y prueba física por USB. Web sin inicializar. **Entrega tentativa del sistema completo: 14/01/2027.** Julian desarrolla móvil, John Ortiz web y ambos backend, unas 30 h semanales por persona; no es plazo institucional certificado.

Toda la documentación técnica y planificadora está en **[Documentación](Documentación/README.md)**. Empezar por [visión](Documentación/VISION.md), [plan](Documentación/PLAN_MOVIL.md), [estado](Documentación/ESTADO.md) y [guía de Codex](Documentación/GUIA_CODEX.md). Word de revisión y registro de cambios en esa misma carpeta. Versiones anteriores en Historial, sin vigencia operativa.

La base Android está en apps/mobile; instrucciones en [Aplicación móvil y apariencia](Documentación/MOVIL_APARIENCIA.md). FastAPI base está en services/api; web y funciones completas siguen pendientes. Los contratos iniciales viven en Documentación/Contratos. `python scripts/validate_foundation.py` valida documentación y contratos; mobile.yml comprueba Flutter y api.yml prueba la base API con PostgreSQL/PostGIS. No hay despliegue del piloto.

Exploración visual: [cinco propuestas](Documentación/Diseno/README.md). El usuario eligió premium con cambio de color; la base Flutter adapta Premium Órbita. El HTML sigue como antecedente visual y no es la aplicación móvil.

Base de pantallas: [registro y apelaciones APP02](Documentación/PANTALLAS_REGISTRO.md). Primera entrega académica para Colombia y automóviles; dos apelaciones y nueva solicitud tras 30 días del rechazo definitivo. La aplicación muestra interfaz, no aprobaciones ni cuentas simuladas; backend, documentos y biometría pendientes.

Primer paso funcional preparado: [contrato de registro v2](Documentación/CONTRATO_REGISTRO.md), con campos, consentimiento, respuestas y migración desde el diseño v1. El alta está implementada solo para pruebas sintéticas; sesiones pendientes. [Prueba de APP02 reportada](Documentación/PRUEBA_APP02.md): diseños correctos en general, con tirones pendientes de medir.

Base compartida: [API01 y migraciones](Documentación/BASE_API.md). Ejecutable sin registro abierto; no sustituye el consentimiento final ni implementa aún el alta completa. Las comprobaciones documentales, las pruebas HTTP sin base y la integración PostgreSQL se reportan por separado.

Registro transaccional de pruebas implementado en [API02](Documentación/REGISTRO_BACKEND.md). Sigue cerrado para datos reales; APP03 consume este contrato en integración sintética.

[APP03 conecta el registro móvil al entorno sintético](Documentación/INTEGRACION_MOVIL.md). HTTP/Android verificados en CI; faltan requisitos Windows y prueba física. Registro real cerrado y sin sesión.
