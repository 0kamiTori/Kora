/**
 * PUNTO DE INTEGRACIÓN — Vista pública del Contacto de Confianza (RF10, RNF02).
 * Endpoint SIN sesión: la única credencial es el token opaco del enlace.
 */
import { apiRequest } from '../../shared/api/client';
import type { ISODateString, LatLng } from '../../shared/types/common.types';
import type { TripStatus } from '../trips/trip.types';

/** Posición mínima para la vista pública: sin velocidad ni identificadores de viaje. */
export interface PublicPosition extends LatLng {
  id: string;
  accuracyMeters: number;
  deviceTimestamp: ISODateString;
  serverTimestamp: ISODateString;
}

/**
 * Lo único que ve el Contacto de Confianza: estado, última posición y su hora.
 * Deliberadamente NO incluye nombres, teléfonos, placa, ruta ni datos de administración.
 */
export interface PublicTripView {
  tripStatus: TripStatus;
  lastPosition: PublicPosition | null;
  /** El enlace deja de funcionar en este instante. */
  expiresAt: ISODateString;
  /** Umbral vigente de pérdida de señal, para no mostrar un dato viejo como actual. */
  signalLossThresholdSeconds: number;
}

/** Códigos de error que el backend debe devolver en `code` (404/410). */
export type ShareLinkErrorCode = 'link_expired' | 'link_revoked' | 'link_not_found';

/**
 * GET /public/track/{token} → PublicTripView.
 * 410 + code "link_expired" | "link_revoked"; 404 + code "link_not_found".
 * SUPUESTO: la vista pública consulta por REST cada pocos segundos (sin WebSocket).
 */
export function getSharedTrip(token: string, signal?: AbortSignal): Promise<PublicTripView> {
  return apiRequest<PublicTripView>({
    path: `/public/track/${encodeURIComponent(token)}`,
    auth: false,
    signal,
  });
}
