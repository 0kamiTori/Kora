/**
 * PUNTO DE INTEGRACIÓN — Alertas e incidencias (RF08, RF09, RF12).
 * Cada función corresponde a un endpoint REST. Las alertas nuevas se anuncian por
 * WebSocket ("alert.created" / "alert.updated"); el portal vuelve a consultar esta
 * lista al recibirlas, así el estado mostrado siempre es el del backend.
 */
import { apiRequest } from '../../shared/api/client';
import type { Alert, ResolveAlertRequest } from './alert.types';

export const ALERTS_QUERY_KEY = ['alerts'] as const;

/** GET /alerts → Alert[] (abiertas, en atención y resueltas recientes). Permiso: alerts:view. */
export function listAlerts(): Promise<Alert[]> {
  return apiRequest<Alert[]>({ path: '/alerts' });
}

/**
 * POST /alerts/{id}/acknowledge → Alert. Permiso: alerts:attend.
 * Registra quién atiende y cuándo. Solo entonces la alerta sale del banner.
 */
export function acknowledgeAlert(alertId: string): Promise<Alert> {
  return apiRequest<Alert>({
    method: 'POST',
    path: `/alerts/${encodeURIComponent(alertId)}/acknowledge`,
  });
}

/** POST /alerts/{id}/resolve → Alert. Permiso: alerts:attend. Cuerpo: { outcome, notes }. */
export function resolveAlert(alertId: string, resolution: ResolveAlertRequest): Promise<Alert> {
  return apiRequest<Alert>({
    method: 'POST',
    path: `/alerts/${encodeURIComponent(alertId)}/resolve`,
    body: resolution,
  });
}
