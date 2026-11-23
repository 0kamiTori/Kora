/**
 * PUNTO DE INTEGRACIÓN — Viajes (RF03, RF06, RF07, RF11, RNF02).
 * Cada función corresponde a un endpoint REST. Las posiciones en vivo NO llegan por
 * aquí: llegan por WebSocket (evento "position.updated", ver RealtimeProvider).
 */
import { apiRequest } from '../../shared/api/client';
import type { Position, Trip, TripDetail, TripScope } from './trip.types';

/**
 * GET /trips?scope=active|recent → Trip[]. Permiso: trips:monitor.
 * El backend debe devolver solo los viajes que el usuario puede ver (RNF01).
 */
export function listTrips(scope: TripScope): Promise<Trip[]> {
  return apiRequest<Trip[]>({ path: '/trips', query: { scope } });
}

/** GET /trips/{id} → TripDetail. Permiso: trips:monitor. 403 si el viaje no le corresponde. */
export function getTrip(tripId: string): Promise<TripDetail> {
  return apiRequest<TripDetail>({ path: `/trips/${encodeURIComponent(tripId)}` });
}

/**
 * POST /trips/{id}/position-history → Position[]. Permiso: trips:history.
 * Cuerpo: { justification }. Coordenadas históricas = dato sensible: el backend debe
 * auditar la consulta y negarla (422) sin justificación.
 */
export function requestPositionHistory(tripId: string, justification: string): Promise<Position[]> {
  return apiRequest<Position[]>({
    method: 'POST',
    path: `/trips/${encodeURIComponent(tripId)}/position-history`,
    body: { justification },
  });
}
