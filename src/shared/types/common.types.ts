/** Fecha y hora en ISO 8601 con zona (UTC), tal como la entrega la API. */
export type ISODateString = string;

export type EntityId = string;

export interface LatLng {
  lat: number;
  lng: number;
}

/** Cuerpo de error esperado de la API. SUPUESTO: FastAPI devolverá { code, message }. */
export interface ApiErrorBody {
  code: string;
  message: string;
}

/** Referencia mínima a quien ejecuta una acción (para trazabilidad). */
export interface ActorRef {
  id: EntityId;
  name: string;
}
