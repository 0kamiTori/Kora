# Köra
Sistema académico de movilidad segura para mujeres: aplicación Android con perfiles de pasajera y conductora, web administrativa y backend compartido. Repositorio [0kamiTori/Kora](https://github.com/0kamiTori/Kora).

**Estado al 26/11/2026:** base Flutter Android premium con apariencia configurable y pantallas de registro, solicitud, estado y apelaciones. Registro y envíos aún sin conexión; web y backend no implementados. **Entrega tentativa del sistema completo: 14/01/2027.** Julian desarrolla móvil, John Ortiz web y ambos backend; unas 30 h semanales por persona. No se presenta como fecha institucional certificada ni como factibilidad comprobada.

Toda la documentación técnica y planificadora está en **[Documentación](Documentación/README.md)**. Empezar por [visión](Documentación/VISION.md), [plan](Documentación/PLAN_MOVIL.md), [estado](Documentación/ESTADO.md) y [guía de Codex](Documentación/GUIA_CODEX.md). Word de revisión y registro de cambios en esa misma carpeta. Versiones anteriores en Historial, sin vigencia operativa.

La base Android está en apps/mobile; instrucciones en [Aplicación móvil y apariencia](Documentación/MOVIL_APARIENCIA.md). Web, servicios e infraestructura siguen pendientes. Los contratos iniciales viven en Documentación/Contratos. `python scripts/validate_foundation.py` valida documentación y contratos; las pruebas reales de Flutter y compilación Android están en el workflow mobile.yml. No hay servicios contratados.

Exploración visual: [cinco propuestas](Documentación/Diseno/README.md). El usuario eligió premium con cambio de color; la base Flutter adapta Premium Órbita. El HTML sigue como antecedente visual y no es la aplicación móvil.

Última historia: [pantallas de registro y apelaciones APP02](Documentación/PANTALLAS_REGISTRO.md). Primera entrega académica para Colombia y automóviles; dos apelaciones y nueva solicitud tras 30 días del rechazo definitivo. La aplicación muestra interfaz, no aprobaciones ni cuentas simuladas; backend, documentos y biometría pendientes.
