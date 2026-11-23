# admin-web

Portal web administrativo de la **Plataforma de movilidad segura para mujeres**
(Propuesta 65-2026-185, prototipo académico). Lo usa la Administración del piloto para
gestionar conductoras, monitorear viajes en vivo, atender alertas e incidencias, configurar
parámetros y consultar auditoría. Incluye la vista pública `/track/:token` para el Contacto
de Confianza.

> **Estado:** el backend no existe todavía. El portal funciona completo contra un
> **adaptador mock en memoria** con datos ficticios. Los puntos donde se conecta la API real
> están marcados en el código y listados en [Integración con el backend](#integración-con-el-backend).

## Requisitos

- Node.js **20.19 o superior** (probado con 24.22.1) y npm.

## Instalación y ejecución

```bash
npm ci                 # instala exactamente las versiones de package-lock.json
cp .env.example .env.local   # opcional; en Windows: copy .env.example .env.local
npm run dev            # http://localhost:5173
```

Sin `.env.local` el portal arranca en modo mock, que es lo esperado para desarrollar.

## Variables de entorno

Se definen en `.env.local` (ignorado por git). **Nunca commitees claves reales.** Todo lo
que empieza por `VITE_` queda visible en el navegador: no pongas secretos ahí.

| Variable                   | Para qué sirve                                                               | Por defecto                    |
| -------------------------- | ---------------------------------------------------------------------------- | ------------------------------ |
| `VITE_API_BASE_URL`        | URL base de la API REST. Solo se usa con `VITE_USE_MOCKS=false`.             | `http://localhost:8000/api/v1` |
| `VITE_WS_URL`              | URL del WebSocket de administración. Solo se usa con `VITE_USE_MOCKS=false`. | `ws://localhost:8000/ws/admin` |
| `VITE_GOOGLE_MAPS_WEB_KEY` | Clave web de Google Maps. Vacía = mapa esquemático SVG.                      | vacía                          |
| `VITE_USE_MOCKS`           | `true` usa el adaptador mock; `false` llama al backend real.                 | `true`                         |
| `VITE_HELP_CHANNEL_URL`    | Canal de ayuda configurado (`tel:` o URL). Vacía = sin canal.                | vacía                          |

## Scripts

| Comando                    | Qué hace                                            |
| -------------------------- | --------------------------------------------------- |
| `npm run dev`              | Servidor de desarrollo.                             |
| `npm run build`            | Verifica tipos y genera `dist/`.                    |
| `npm run preview`          | Sirve `dist/` localmente.                           |
| `npm run typecheck`        | `tsc --noEmit` (TypeScript strict).                 |
| `npm run lint`             | ESLint.                                             |
| `npm run format`           | Prettier (escribe). `format:check` solo comprueba.  |
| `npm test`                 | Pruebas unitarias (Vitest).                         |
| `npm run test:e2e:install` | Descarga Chromium para Playwright (una sola vez).   |
| `npm run test:e2e`         | Pruebas E2E (Playwright). Compila y sirve el build. |

## Datos de prueba (modo mock)

Contraseña de todos los usuarios: `Piloto-2026`. Existe solo en el mock.

| Correo                     | Rol                         | Puede                                                   |
| -------------------------- | --------------------------- | ------------------------------------------------------- |
| `admin@piloto.test`        | Administración general      | Todo.                                                   |
| `operadora@piloto.test`    | Operación y monitoreo       | Viajes, recorrido histórico, alertas; ver conductoras.  |
| `verificadora@piloto.test` | Verificación de conductoras | Revisar solicitudes y consultar datos sensibles.        |
| `auditora@piloto.test`     | Auditoría y privacidad      | Auditoría, parámetros (lectura) y solicitudes de datos. |

Qué trae el mock para probar cada regla:

- **Conductoras:** `D-01` se puede aprobar (identidad confirmada); `D-05` no (verificación
  pendiente); `D-03` vencida, `D-04` fallida, `D-06` rechazada con verificación diferida.
- **Viajes:** `T-1001` normal; `T-1002` desviado de la ruta; `T-1003` sin señal (último dato
  de hace más de 30 s).
- **Alertas:** `A-5001` abierta desde el inicio. A los ~6 s de entrar llega la alerta crítica
  `A-5002`, y 1 s después el simulador **reenvía el mismo evento** para comprobar que no se
  duplica.
- **Enlaces públicos:** `/track/demo-activo-7f3a9c21`, `/track/demo-expirado-b81d04e6` y
  `/track/demo-revocado-2c9e55aa`.

Los datos viven en memoria y **se reinician al recargar la página**. La sesión mock sí
sobrevive a la recarga (simula la cookie de renovación con `sessionStorage`).

## Integración con el backend

Para conectar la API real:

1. En `.env.local`: `VITE_USE_MOCKS=false`, `VITE_API_BASE_URL` y `VITE_WS_URL`.
2. Compara cada endpoint con el contrato real y ajusta `path`, `method` y tipos en el archivo
   indicado. Cada función tiene un comentario `PUNTO DE INTEGRACIÓN` con su ruta y permiso.
3. Lo que el frontend necesita del backend está en
   [`docs/api-contract-requests.md`](docs/api-contract-requests.md).

| Qué                              | Archivo                                              | Endpoints                                                                       |
| -------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| Cliente HTTP, token y renovación | `src/shared/api/client.ts`                           | Todas las llamadas REST pasan por `apiRequest`.                                 |
| Configuración de entorno         | `src/shared/api/config.ts`                           | —                                                                               |
| Autenticación                    | `src/features/auth/auth.api.ts`                      | `POST /auth/login`, `/auth/refresh`, `/auth/logout`                             |
| Conductoras                      | `src/features/drivers/drivers.api.ts`                | `GET /drivers`, `GET /drivers/{id}`, `POST …/review`, `POST …/sensitive-assets` |
| Viajes                           | `src/features/trips/trips.api.ts`                    | `GET /trips`, `GET /trips/{id}`, `POST …/position-history`                      |
| Alertas                          | `src/features/incidents/alerts.api.ts`               | `GET /alerts`, `POST …/acknowledge`, `POST …/resolve`                           |
| Parámetros                       | `src/features/governance/parameters.api.ts`          | `GET /parameters`, `GET …/versions`, `PUT /parameters/{key}`                    |
| Auditoría y privacidad           | `src/features/governance/auditPrivacy.api.ts`        | `GET /audit-log`, `GET /privacy-requests`, `POST …/status`                      |
| Vista pública                    | `src/features/public-tracking/publicTracking.api.ts` | `GET /public/track/{token}`                                                     |
| WebSocket (conexión)             | `src/shared/api/wsClient.ts`                         | Mensaje `auth`, sobre `{ eventId, type, emittedAt, payload }`                   |
| WebSocket (eventos)              | `src/app/providers/RealtimeProvider.tsx`             | `position.updated`, `alert.created`, `alert.updated`, `trip.updated`            |
| Mapa                             | `src/features/trips/map/MapProvider.ts`              | Interfaz `MapProvider`; implementaciones SVG y Google                           |
| Roles y permisos                 | `src/features/auth/auth.types.ts`                    | Tipo `Permission` y matriz de referencia                                        |

El adaptador mock (`src/mocks/`) se carga con `import()` dinámico: con `VITE_USE_MOCKS=false`
no se ejecuta. Puede borrarse cuando el backend esté disponible; las pruebas E2E dependen de él.

## Estructura

```
src/
├── app/            App, router, ProtectedRoute, providers (Auth, Realtime)
├── features/       auth, dashboard, drivers, trips (+map), incidents, governance, public-tracking
├── mocks/          adaptador mock: db.ts (datos), mockServer.ts (REST), simulator.ts (tiempo real)
└── shared/         api, layout, ui, security, hooks, utils, types, styles
tests/
├── unit/           connectivityWatchdog (RNF04), anomalyFactors (RF08)
└── e2e/            driver-approval, live-alert-handling, public-share-link, access-control
docs/api-contract-requests.md
```

## Decisiones de seguridad y privacidad

- **Tokens:** el token de acceso vive solo en memoria. La renovación depende de una cookie
  `httpOnly` del backend. No se guarda nada sensible en `localStorage`.
- **RBAC:** el menú, las rutas (`ProtectedRoute`) y las acciones usan los permisos de la
  sesión. Es defensa en profundidad: **la garantía real debe darla el backend con `403`**.
- **Datos sensibles:** fotografías, plantillas y recorridos históricos solo se piden tras
  escribir una justificación, que viaja en la misma petición. El resultado no se guarda en
  caché y se puede ocultar.
- **Verificación:** solo el estado `confirmed` se muestra como identidad confirmada.
- **Datos antiguos:** toda posición muestra la hora de su dato. Pasado el umbral de pérdida
  de señal (parámetro `signal_loss_seconds`), el marcador se dibuja como posición antigua.
- **Alertas:** el banner no se puede cerrar; una alerta sale de él solo al registrar la
  atención. El sonido empieza desactivado y se habilita con un botón (autoplay).
- **Entregas:** una notificación solo se muestra como entregada si trae `confirmedAt`.
- **Eventos duplicados:** se descartan por `eventId` (eventos) y por `id` (posiciones).
- **Índice operativo de anomalía:** no es una probabilidad de delito; la pantalla explica
  cada factor.
- **Vista pública:** estado, última posición y su hora. Nada más.

## Librerías (versiones fijadas, sin rangos)

| Librería                | Versión       | Por qué                                                        |
| ----------------------- | ------------- | -------------------------------------------------------------- |
| `react`, `react-dom`    | 18.3.1        | Base del portal.                                               |
| `react-router-dom`      | 6.28.0        | Rutas anidadas y guardias para privadas y `/track/:token`.     |
| `@tanstack/react-query` | 5.59.0        | Caché, reintentos e invalidación desde eventos en tiempo real. |
| `vite`                  | 5.4.11        | Servidor de desarrollo y build.                                |
| `typescript`            | 5.6.3         | Modo strict.                                                   |
| `vitest`                | 2.1.5         | Pruebas unitarias con reloj simulado.                          |
| `@playwright/test`      | 1.48.2        | Pruebas E2E.                                                   |
| `eslint`, `prettier`    | 9.14.0, 3.3.3 | Lint y formato.                                                |

Sin librería de formularios, de estilos, de HTTP ni de mapas: se usan formularios
controlados, CSS con variables, `fetch` y una interfaz de mapa propia.

## Supuestos abiertos

Están marcados en el código con `// SUPUESTO:`. Los principales:

1. **Umbrales 100 m / 30 s / 180 s** sin confirmar con el SRS (no estaba disponible). Son
   datos del mock, editables en Parámetros.
2. **Roles y permisos** (cuatro roles, doce permisos) definidos por el frontend.
3. **Estados de viaje y sus transiciones**, tipos de alerta, severidades y resultados de
   resolución: catálogos propuestos.
4. **Sesión:** token de acceso en el cuerpo + renovación por cookie `httpOnly`.
5. **Rutas REST, sobre WebSocket y nombres de eventos:** propuesta del frontend.
6. **Vista pública por consulta periódica** (cada 5 s), sin WebSocket.
7. **El backend calcula** desviación, parada, índice de anomalía y su nivel; el portal solo
   los muestra.
8. **Documento y teléfono enmascarados** por el backend.
9. **Aprobar exige identidad confirmada.** El documento no lo dice de forma explícita.
10. El watchdog usa la hora de recepción en el navegador para posiciones en vivo y la hora
    del servidor para las cargadas por REST; asume relojes razonablemente sincronizados.

## Pendientes conocidos

- El proveedor **Google Maps está implementado pero sin probar** con una clave real.
- El mapa por defecto es **esquemático** (posiciones a escala, sin calles).
- `public/favicon.ico`, `public/logos/logo.svg` y `public/sounds/critical-alert.mp3` son
  **provisionales**, generados para el prototipo.
- Las listas se filtran y ordenan en el cliente (sin paginación de servidor).
- Fuera de alcance, no implementado: pagos, tarifas dinámicas, despacho masivo, integración
  con autoridades, iOS y publicación en tiendas. «Contactar ayuda» solo abre el canal
  configurado.
