import type { ActorRef, EntityId, ISODateString } from '../../shared/types/common.types';

/* ---------- Auditoría (RF12) ---------- */

/** SUPUESTO: catálogo de acciones auditadas. */
export type AuditAction =
  | 'auth.login'
  | 'driver.approved'
  | 'driver.rejected'
  | 'sensitive.photo_viewed'
  | 'sensitive.template_viewed'
  | 'trip.history_viewed'
  | 'alert.acknowledged'
  | 'alert.resolved'
  | 'parameter.updated'
  | 'privacy.status_changed';

export const AUDIT_ACTION_LABELS: Readonly<Record<AuditAction, string>> = {
  'auth.login': 'Inicio de sesión',
  'driver.approved': 'Conductora aprobada',
  'driver.rejected': 'Conductora rechazada',
  'sensitive.photo_viewed': 'Consulta de fotografía',
  'sensitive.template_viewed': 'Consulta de plantilla biométrica',
  'trip.history_viewed': 'Consulta de recorrido histórico',
  'alert.acknowledged': 'Atención de alerta registrada',
  'alert.resolved': 'Incidencia resuelta',
  'parameter.updated': 'Parámetro modificado',
  'privacy.status_changed': 'Solicitud de datos actualizada',
};

export interface AuditEntry {
  id: EntityId;
  at: ISODateString;
  actor: ActorRef;
  action: AuditAction;
  resourceType: string;
  resourceId: EntityId;
  /** Justificación declarada al consultar datos sensibles (RNF02). */
  justification: string | null;
  detail: string | null;
}

/* ---------- Parámetros versionados (RF07) ---------- */

export type ParameterKey =
  | 'route_deviation_meters'
  | 'signal_loss_seconds'
  | 'prolonged_stop_seconds';

export interface Parameter {
  key: ParameterKey;
  label: string;
  description: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  version: number;
  updatedAt: ISODateString;
  updatedBy: ActorRef;
}

export interface ParameterVersion {
  key: ParameterKey;
  version: number;
  previousValue: number | null;
  newValue: number;
  changedBy: ActorRef;
  changedAt: ISODateString;
  reason: string;
}

export interface UpdateParameterRequest {
  value: number;
  reason: string;
}

/* ---------- Solicitudes de datos personales, Ley 1581 (RF13) ---------- */

export type PrivacyRequestType = 'access' | 'consent_withdrawal' | 'deletion';

export type PrivacyRequestStatus = 'received' | 'in_review' | 'completed' | 'rejected';

/** SUPUESTO: flujo de estados de una solicitud. */
export const PRIVACY_TRANSITIONS: Readonly<
  Record<PrivacyRequestStatus, readonly PrivacyRequestStatus[]>
> = {
  received: ['in_review'],
  in_review: ['completed', 'rejected'],
  completed: [],
  rejected: [],
};

export const PRIVACY_TYPE_LABELS: Readonly<Record<PrivacyRequestType, string>> = {
  access: 'Consulta de datos',
  consent_withdrawal: 'Retiro de consentimiento',
  deletion: 'Eliminación de datos',
};

export const PRIVACY_STATUS_LABELS: Readonly<Record<PrivacyRequestStatus, string>> = {
  received: 'Recibida',
  in_review: 'En revisión',
  completed: 'Completada',
  rejected: 'Rechazada',
};

export interface PrivacyRequestEvent {
  at: ISODateString;
  actor: string;
  status: PrivacyRequestStatus;
  note: string;
}

export interface PrivacyRequest {
  id: EntityId;
  type: PrivacyRequestType;
  subjectAlias: string;
  subjectRole: 'passenger' | 'driver' | 'trusted_contact';
  status: PrivacyRequestStatus;
  createdAt: ISODateString;
  /** SUPUESTO: fecha límite legal calculada por el backend. */
  dueAt: ISODateString;
  history: PrivacyRequestEvent[];
}

export interface UpdatePrivacyRequest {
  status: PrivacyRequestStatus;
  note: string;
}

/* ---------- Enlace temporal de seguimiento (RF10) ---------- */

export interface ShareLink {
  /** Token opaco: no codifica datos del viaje ni de personas. */
  token: string;
  tripId: EntityId;
  createdAt: ISODateString;
  expiresAt: ISODateString;
  revokedAt: ISODateString | null;
}
