/**
 * PUNTO DE INTEGRACIÓN — Conductoras (RF02, RF04, RF05, RNF02).
 * Cada función corresponde a un endpoint REST. Para integrar, ajusta `path`/`method`
 * y los tipos de `driver.types.ts` al contrato real del backend.
 */
import { apiRequest } from '../../shared/api/client';
import type {
  Driver,
  DriverDetail,
  ReviewDecision,
  SensitiveAsset,
  SensitiveAssetKind,
} from './driver.types';

/** GET /drivers → Driver[]. Permiso: drivers:view. */
export function listDrivers(): Promise<Driver[]> {
  return apiRequest<Driver[]>({ path: '/drivers' });
}

/** GET /drivers/{id} → DriverDetail. Permiso: drivers:view. Sin fotos ni plantillas. */
export function getDriver(driverId: string): Promise<DriverDetail> {
  return apiRequest<DriverDetail>({ path: `/drivers/${encodeURIComponent(driverId)}` });
}

/**
 * POST /drivers/{id}/review → DriverDetail. Permiso: drivers:review.
 * Cuerpo: { decision: "approve" } | { decision: "reject", reason }.
 * El backend debe rechazar (422) un rechazo sin motivo.
 */
export function reviewDriver(driverId: string, decision: ReviewDecision): Promise<DriverDetail> {
  return apiRequest<DriverDetail>({
    method: 'POST',
    path: `/drivers/${encodeURIComponent(driverId)}/review`,
    body: decision,
  });
}

/**
 * POST /drivers/{id}/sensitive-assets → SensitiveAsset. Permiso: drivers:sensitive.
 * Cuerpo: { kind, justification }. El backend debe registrar la consulta en auditoría
 * y negar (422) cualquier petición sin justificación.
 * SUPUESTO: se usa POST para que la justificación viaje en el cuerpo y no en la URL.
 */
export function requestSensitiveAsset(
  driverId: string,
  kind: SensitiveAssetKind,
  justification: string,
): Promise<SensitiveAsset> {
  return apiRequest<SensitiveAsset>({
    method: 'POST',
    path: `/drivers/${encodeURIComponent(driverId)}/sensitive-assets`,
    body: { kind, justification },
  });
}
