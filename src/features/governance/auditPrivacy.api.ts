/**
 * PUNTO DE INTEGRACIÓN — Auditoría (RF12) y solicitudes de datos personales (RF13).
 */
import { apiRequest } from '../../shared/api/client';
import type { AuditEntry, PrivacyRequest, UpdatePrivacyRequest } from './audit.types';

/** GET /audit-log → AuditEntry[] (más reciente primero). Permiso: audit:view. */
export function listAuditEntries(): Promise<AuditEntry[]> {
  return apiRequest<AuditEntry[]>({ path: '/audit-log' });
}

/** GET /privacy-requests → PrivacyRequest[]. Permiso: privacy:manage. */
export function listPrivacyRequests(): Promise<PrivacyRequest[]> {
  return apiRequest<PrivacyRequest[]>({ path: '/privacy-requests' });
}

/**
 * POST /privacy-requests/{id}/status → PrivacyRequest. Permiso: privacy:manage.
 * Cuerpo: { status, note }. El backend valida la transición y agrega el evento al historial.
 */
export function updatePrivacyRequest(
  requestId: string,
  update: UpdatePrivacyRequest,
): Promise<PrivacyRequest> {
  return apiRequest<PrivacyRequest>({
    method: 'POST',
    path: `/privacy-requests/${encodeURIComponent(requestId)}/status`,
    body: update,
  });
}
