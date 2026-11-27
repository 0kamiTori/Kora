import type { BadgeDescriptor } from '../../shared/ui/StatusBadge';
import type {
  DocumentStatus,
  DriverStatus,
  LivenessStatus,
  VerificationKind,
  VerificationResult,
  VerificationStatus,
} from './driver.types';

/**
 * Regla de negocio: verificación pendiente ≠ confirmada (RF04, RF05).
 * Solo `confirmed` usa el estilo de éxito. Vencida y diferida se muestran como
 * pendientes, y fallida con su propio estilo. Nunca se presentan como identidad confirmada.
 */
const VERIFICATION: Readonly<Record<VerificationStatus, BadgeDescriptor>> = {
  confirmed: { tone: 'success', label: 'Identidad confirmada' },
  pending: { tone: 'warning', label: 'Verificación pendiente' },
  deferred: { tone: 'warning', label: 'Verificación diferida (pendiente)' },
  expired: { tone: 'warning', label: 'Verificación vencida (pendiente)' },
  failed: { tone: 'danger', label: 'Verificación fallida' },
};

export function verificationBadge(status: VerificationStatus): BadgeDescriptor {
  return VERIFICATION[status];
}

const DRIVER_STATUS: Readonly<Record<DriverStatus, BadgeDescriptor>> = {
  pending_review: { tone: 'warning', label: 'Pendiente de revisión' },
  approved: { tone: 'success', label: 'Aprobada' },
  rejected: { tone: 'danger', label: 'Rechazada' },
  suspended: { tone: 'neutral', label: 'Suspendida' },
};

export function driverStatusBadge(status: DriverStatus): BadgeDescriptor {
  return DRIVER_STATUS[status];
}

export const DRIVER_STATUS_OPTIONS: ReadonlyArray<{ value: DriverStatus; label: string }> = [
  { value: 'pending_review', label: 'Pendientes de revisión' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'suspended', label: 'Suspendidas' },
];

export const VERIFICATION_KIND_LABELS: Readonly<Record<VerificationKind, string>> = {
  enrollment: 'Registro inicial',
  periodic: 'Periódica',
  pre_trip: 'Antes del viaje',
};

export const LIVENESS_LABELS: Readonly<Record<LivenessStatus, string>> = {
  passed: 'Prueba de vida superada',
  failed: 'Prueba de vida no superada',
  not_performed: 'Prueba de vida no realizada',
};

/** Resultado de la comparación 1:1 con la referencia de la misma persona. */
export const RESULT_LABELS: Readonly<Record<VerificationResult, string>> = {
  match: 'Coincide con la referencia',
  no_match: 'No coincide con la referencia',
  inconclusive: 'No concluyente',
};

const DOCUMENT: Readonly<Record<DocumentStatus, BadgeDescriptor>> = {
  valid: { tone: 'success', label: 'Vigente' },
  pending: { tone: 'warning', label: 'Pendiente' },
  expired: { tone: 'danger', label: 'Vencido' },
  rejected: { tone: 'danger', label: 'Rechazado' },
};

export function documentBadge(status: DocumentStatus): BadgeDescriptor {
  return DOCUMENT[status];
}
