import type { ActorRef, EntityId, ISODateString } from '../../shared/types/common.types';
import type { ConsentRecord } from '../auth/auth.types';

/** Estado de la solicitud de la conductora ante la administración (RF02). */
export type DriverStatus = 'pending_review' | 'approved' | 'rejected' | 'suspended';

/**
 * Estado de la verificación de identidad (RF04, RF05).
 * Solo `confirmed` puede mostrarse como identidad confirmada.
 * `pending`, `deferred` y `expired` se muestran como pendientes; `failed` como fallida.
 */
export type VerificationStatus = 'confirmed' | 'pending' | 'deferred' | 'expired' | 'failed';

/** Resultado de la comparación facial 1:1 contra la referencia de la misma persona. */
export type VerificationResult = 'match' | 'no_match' | 'inconclusive';

export type LivenessStatus = 'passed' | 'failed' | 'not_performed';

export type VerificationKind = 'enrollment' | 'periodic' | 'pre_trip';

export interface Verification {
  id: EntityId;
  driverId: EntityId;
  kind: VerificationKind;
  status: VerificationStatus;
  result: VerificationResult | null;
  /** Puntuación de similitud 0..1; null si no se completó. */
  score: number | null;
  /** Umbral de decisión vigente cuando se ejecutó. */
  threshold: number;
  modelVersion: string;
  livenessStatus: LivenessStatus;
  requestedAt: ISODateString;
  completedAt: ISODateString | null;
  /** Fecha límite de una verificación periódica (RF05). */
  dueAt: ISODateString | null;
}

/**
 * Metadatos de la referencia biométrica. El contenido (foto o plantilla) NUNCA
 * viaja aquí: se pide aparte con justificación (RNF02).
 */
export interface BiometricReference {
  id: EntityId;
  driverId: EntityId;
  createdAt: ISODateString;
  modelVersion: string;
  hasPhoto: boolean;
  hasTemplate: boolean;
}

export type DocumentStatus = 'valid' | 'pending' | 'expired' | 'rejected';

export interface DriverDocument {
  id: EntityId;
  label: string;
  status: DocumentStatus;
  expiresAt: ISODateString | null;
}

export interface Vehicle {
  plate: string;
  model: string;
  color: string;
}

export interface Driver {
  id: EntityId;
  fullName: string;
  /** SUPUESTO: el backend entrega documento y teléfono ya enmascarados. */
  documentNumberMasked: string;
  phoneMasked: string;
  status: DriverStatus;
  registeredAt: ISODateString;
  vehicle: Vehicle;
  identityVerification: VerificationStatus;
  rejectionReason: string | null;
  reviewedBy: ActorRef | null;
  reviewedAt: ISODateString | null;
}

export interface DriverDetail extends Driver {
  consent: ConsentRecord;
  verifications: Verification[];
  biometricReference: BiometricReference | null;
  documents: DriverDocument[];
}

export type ReviewDecision =
  | { decision: 'approve' }
  /** RF02: el rechazo exige motivo. */
  | { decision: 'reject'; reason: string };

export type SensitiveAssetKind = 'photo' | 'template';

/** Respuesta a una consulta justificada de dato sensible (RNF02). */
export interface SensitiveAsset {
  kind: SensitiveAssetKind;
  driverId: EntityId;
  /** SUPUESTO: URL firmada de vida corta; null en el mock. */
  contentUrl: string | null;
  description: string;
  /** Identificador del registro de auditoría generado por la consulta. */
  auditEntryId: EntityId;
  expiresAt: ISODateString;
}
