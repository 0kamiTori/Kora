# Peticiones de contrato al backend

El portal `admin-web` se desarrolló sin backend. Este documento lista **lo que el frontend
necesita** de la API (FastAPI) y del WebSocket. Todo lo que aparece aquí es una **propuesta
del frontend**: los nombres de rutas, campos y eventos pueden cambiar; cuando cambien, se
ajusta el archivo indicado en la columna «Dónde se integra».

Convenciones propuestas:

- Base REST: `VITE_API_BASE_URL` (por ejemplo `https://host/api/v1`). JSON en UTF-8.
- Fechas en ISO 8601 con zona (UTC).
- Errores: `{ "code": "texto_estable", "message": "Mensaje en español" }` con el código HTTP
  adecuado (401, 403, 404, 409, 410, 422).
- Los tipos exactos de cada cuerpo están en los archivos `*.types.ts` de cada feature.

## 1. Autenticación y sesión (RF01, RNF01)

| Método y ruta        | Respuesta       | Dónde se integra                |
| -------------------- | --------------- | ------------------------------- |
| `POST /auth/login`   | `LoginResponse` | `src/features/auth/auth.api.ts` |
| `POST /auth/refresh` | `LoginResponse` | `src/features/auth/auth.api.ts` |
| `POST /auth/logout`  | `204`           | `src/features/auth/auth.api.ts` |

Peticiones:

1. **Token de acceso de vida corta en el cuerpo** de la respuesta y **token de renovación en
   cookie `httpOnly`, `Secure`, `SameSite=Strict`**. El portal guarda el token de acceso solo
   en memoria y nunca usa `localStorage`.
2. `POST /auth/refresh` sin cuerpo: lee la cookie. Se llama al cargar la página y ante un `401`.
3. `LoginResponse.user.permissions` debe traer la lista de permisos efectivos de la sesión.
   El portal no deduce permisos a partir del rol.
4. CORS con credenciales (`Access-Control-Allow-Credentials: true`) para el origen del portal,
   y protección CSRF en `/auth/refresh` y `/auth/logout` al depender de cookie.
5. **Definir roles y permisos.** El frontend asumió cuatro roles y doce permisos
   (`src/features/auth/auth.types.ts`).

## 2. Conductoras (RF02, RF04, RF05, RNF02)

| Método y ruta                         | Permiso             | Dónde se integra                      |
| ------------------------------------- | ------------------- | ------------------------------------- |
| `GET /drivers`                        | `drivers:view`      | `src/features/drivers/drivers.api.ts` |
| `GET /drivers/{id}`                   | `drivers:view`      | `src/features/drivers/drivers.api.ts` |
| `POST /drivers/{id}/review`           | `drivers:review`    | `src/features/drivers/drivers.api.ts` |
| `POST /drivers/{id}/sensitive-assets` | `drivers:sensitive` | `src/features/drivers/drivers.api.ts` |

Peticiones:

1. `review` con `{ "decision": "approve" }` o `{ "decision": "reject", "reason": "..." }`.
   Rechazo sin motivo → `422`. Aprobación con identidad no confirmada → `409`.
2. `GET /drivers/{id}` **no** debe incluir fotografías ni plantillas biométricas, solo
   metadatos (`hasPhoto`, `hasTemplate`).
3. `sensitive-assets` con `{ "kind": "photo" | "template", "justification": "..." }`. Sin
   justificación → `422`. Debe **registrar la consulta en auditoría** y devolver el
   identificador del registro (`auditEntryId`) y una URL firmada de vida corta.
4. Documento y teléfono ya **enmascarados** en la respuesta.
5. Cada verificación debe traer: resultado, puntuación, umbral, versión del modelo, estado de
   la prueba de vida y fecha límite (para las periódicas).

## 3. Viajes (RF03, RF06, RF07, RF11)

| Método y ruta                       | Permiso         | Dónde se integra                  |
| ----------------------------------- | --------------- | --------------------------------- |
| `GET /trips?scope=active\|recent`   | `trips:monitor` | `src/features/trips/trips.api.ts` |
| `GET /trips/{id}`                   | `trips:monitor` | `src/features/trips/trips.api.ts` |
| `POST /trips/{id}/position-history` | `trips:history` | `src/features/trips/trips.api.ts` |

Peticiones:

1. **RNF01:** el backend filtra los viajes que cada usuario puede ver y responde `403` ante un
   viaje ajeno. El portal no puede garantizar esto por sí solo.
2. Cada posición con `id` único, `deviceTimestamp`, `serverTimestamp`, `lat`, `lng` y
   `accuracyMeters`.
3. El backend calcula y entrega `activeDeviation` (metros y desde cuándo) y `activeStop`. El
   portal solo los dibuja.
4. `position-history` con `{ "justification": "..." }`, auditado. Sin justificación → `422`.
5. Confirmar el conjunto de estados de viaje y sus transiciones válidas
   (`TRIP_TRANSITIONS` en `src/features/trips/trip.types.ts`).

## 4. Alertas e incidencias (RF08, RF09, RF12)

| Método y ruta                   | Permiso         | Dónde se integra                       |
| ------------------------------- | --------------- | -------------------------------------- |
| `GET /alerts`                   | `alerts:view`   | `src/features/incidents/alerts.api.ts` |
| `POST /alerts/{id}/acknowledge` | `alerts:attend` | `src/features/incidents/alerts.api.ts` |
| `POST /alerts/{id}/resolve`     | `alerts:attend` | `src/features/incidents/alerts.api.ts` |

Peticiones:

1. El índice operativo de anomalía llega con **todos sus factores** (etiqueta, descripción,
   valor observado, peso y aporte) y con su nivel. La suma de aportes debe igualar el índice.
2. Cada notificación (`deliveries`) con canal, destino sin datos personales de más, intentos,
   último intento, estado y `confirmedAt`. **`delivered` solo con `confirmedAt`**: el portal
   muestra «sin confirmación de entrega» en cualquier otro caso.
3. `acknowledge` registra quién atiende y cuándo. `resolve` recibe `{ outcome, notes }`.
4. Confirmar el catálogo de tipos de alerta, severidades y resultados de resolución.

## 5. Parámetros, auditoría y privacidad (RF07, RF12, RF13)

| Método y ruta                        | Permiso           | Dónde se integra                              |
| ------------------------------------ | ----------------- | --------------------------------------------- |
| `GET /parameters`                    | sesión válida     | `src/features/governance/parameters.api.ts`   |
| `GET /parameters/{key}/versions`     | `parameters:view` | `src/features/governance/parameters.api.ts`   |
| `PUT /parameters/{key}`              | `parameters:edit` | `src/features/governance/parameters.api.ts`   |
| `GET /audit-log`                     | `audit:view`      | `src/features/governance/auditPrivacy.api.ts` |
| `GET /privacy-requests`              | `privacy:manage`  | `src/features/governance/auditPrivacy.api.ts` |
| `POST /privacy-requests/{id}/status` | `privacy:manage`  | `src/features/governance/auditPrivacy.api.ts` |

Peticiones:

1. **Confirmar con el SRS** los valores iniciales 100 m (desviación), 30 s (pérdida de señal)
   y 180 s (parada). En el portal no existen como constantes: se leen de `GET /parameters`.
2. `PUT /parameters/{key}` con `{ value, reason }` crea una versión (quién, cuándo, valor
   anterior y nuevo, motivo). Cada parámetro informa `min` y `max`.
3. `GET /parameters` legible por cualquier sesión de administración: el monitoreo necesita
   los umbrales vigentes.
4. Auditoría de solo lectura, con filtros y paginación en servidor cuando crezca el volumen
   (hoy el portal filtra en cliente).
5. Solicitudes de datos: confirmar tipos, estados, transiciones y cómo se calcula `dueAt`.

## 6. Vista pública del Contacto de Confianza (RF10, RNF02)

| Método y ruta               | Permiso         | Dónde se integra                                     |
| --------------------------- | --------------- | ---------------------------------------------------- |
| `GET /public/track/{token}` | ninguno (token) | `src/features/public-tracking/publicTracking.api.ts` |

Peticiones:

1. Token **opaco**, de alta entropía, con expiración, revocable y limitado a un solo viaje.
2. La respuesta contiene **solo**: estado del viaje, última posición con sus dos instantes,
   expiración del enlace y el umbral vigente de pérdida de señal. Sin nombres, teléfonos,
   placa, ruta ni identificadores internos.
3. Errores: `410` + `link_expired`, `410` + `link_revoked`, `404` + `link_not_found`.
4. Límite de peticiones por token e IP, y cabeceras `Cache-Control: no-store` y
   `Referrer-Policy: no-referrer`.
5. Hoy el portal consulta cada 5 s. Si se prefiere WebSocket o SSE público, avisar.

## 7. Tiempo real por WebSocket (RNF03, RNF04)

Se integra en `src/shared/api/wsClient.ts` (conexión) y
`src/app/providers/RealtimeProvider.tsx` (tipos de evento).

1. URL en `VITE_WS_URL`. Tras abrir, el cliente envía
   `{ "type": "auth", "token": "<token de acceso>", "lastEventId": "<último id o null>" }`.
   El token no viaja en la URL.
2. Cada mensaje del servidor es un sobre
   `{ "eventId": "único", "type": "...", "emittedAt": "ISO", "payload": ... }`.
3. Eventos esperados:
   - `position.updated` — `payload` = `Position`.
   - `alert.created`, `alert.updated` — `payload` = `{ "id": "..." }`.
   - `trip.updated` — `payload` = `{ "id": "..." }`.
4. `eventId` estable ante reenvíos: el cliente descarta duplicados por ese identificador.
5. Definir qué ocurre cuando el token de acceso expira con el socket abierto (el portal
   reconecta y vuelve a enviar `auth` con el token renovado).
