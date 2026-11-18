# Köra

Bases para una aplicación Android de movilidad segura para mujeres, conectada a una web administrativa desarrollada en paralelo. Köra es el nombre indicado por el usuario; el repositorio es [0kamiTori/Kora](https://github.com/0kamiTori/Kora).

**Estado al 18 de noviembre de 2026:** planificación, arquitectura y contratos iniciales. Aún no hay APK, backend desplegado ni sitio web funcional. Los contratos son diseños revisables, no endpoints implementados.

## Inicio

1. Leer [el plan móvil](docs/PLAN_MOVIL.md), incluyendo las hipótesis de tiempo, disponibilidad y presupuesto.
2. Revisar [la arquitectura](docs/ARQUITECTURA.md) y [la sincronización](docs/SINCRONIZACION.md) con quien desarrolla la web.
3. Seguir [la guía para trabajar en Codex](docs/GUIA_CODEX.md).
4. Consultar [el estado y la siguiente tarea](docs/ESTADO.md) y [las decisiones](docs/DECISIONES.md).

## Documentos Word

- [Visión actualizada](Documentacion/01_Documento_vision.docx).
- [Plan general actualizado](Documentacion/02_Plan_desarrollo_y_guia.docx).
- [Registro de cambios](Documentacion/03_Registro_control_cambios.docx).
- [Plan de la aplicación móvil e integración web](Documentacion/04_Plan_aplicacion_movil.docx), documento principal para esta etapa.

La actualización móvil de versión 0.2 prevalece sobre el cronograma anterior de 22 semanas. Las fechas oficiales académicas, la dedicación real del equipo y los fondos disponibles siguen pendientes de confirmación.

## Organización

```text
apps/mobile/              Aplicación Flutter por crear
apps/admin-web/           Web React por crear en paralelo
services/api/             Backend FastAPI compartido por crear
services/biometrics/      Inferencia y detección de vida por evaluar
contracts/                Contrato REST y eventos iniciales
docs/                     Plan, decisiones, integración y guía de Codex
infra/                    Especificación de entornos y despliegue
scripts/                  Verificación del plan y del contrato
Documentacion/            Entregables Word editables
.github/workflows/        Comprobación de las bases documentales
```

No se incluyen dependencias ni configuraciones de despliegue que aparenten una aplicación ya construida. En la primera tarea se generan los proyectos reales con sus herramientas oficiales.

## Comprobación actual

Con Python 3.11 o superior:

```powershell
python scripts/validate_foundation.py
```

Valida fechas, esfuerzo, sumas, referencias del contrato y ejemplos de eventos. Las pruebas de Flutter, web, API, permisos Android y sincronización real se añadirán al crear cada componente.

## Nombre y publicación

GitHub permite renombrar el repositorio y redirige muchas referencias anteriores. Después de renombrarlo se deben actualizar origin, enlaces, CI e integraciones. El identificador Android de publicación se elegirá antes de distribuir una versión definitiva; el nombre del repositorio y el nombre visible de la app son decisiones separadas. Fuente: [GitHub](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository).

Publicar los archivos en GitHub no despliega servicios cloud ni contrata suscripciones. El proveedor recomendado debe configurarse posteriormente con las cuentas y el presupuesto correspondientes.
