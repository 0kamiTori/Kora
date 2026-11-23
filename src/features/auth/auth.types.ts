import type { EntityId, ISODateString } from '../../shared/types/common.types';

/**
 * SUPUESTO: el documento de visión no define roles ni permisos exactos.
 * Se modelan como tipo configurable; ajustar aquí cuando el SRS los fije.
 */
export type Role = 'super_admin' | 'operator' | 'verifier' | 'auditor';

export type Permission =
  | 'dashboard:view'
  | 'drivers:view'
  | 'drivers:review'
  | 'drivers:sensitive'
  | 'trips:monitor'
  | 'trips:history'
  | 'alerts:view'
  | 'alerts:attend'
  | 'audit:view'
  | 'parameters:view'
  | 'parameters:edit'
  | 'privacy:manage';

export const ALL_PERMISSIONS: readonly Permission[] = [
  'dashboard:view',
  'drivers:view',
  'drivers:review',
  'drivers:sensitive',
  'trips:monitor',
  'trips:history',
  'alerts:view',
  'alerts:attend',
  'audit:view',
  'parameters:view',
  'parameters:edit',
  'privacy:manage',
];

/**
 * SUPUESTO: matriz rol → permisos de referencia. La fuente de verdad es el backend:
 * el portal usa los permisos que llegan en `AdminUser.permissions`, no esta tabla.
 * Solo la usa el adaptador mock para poblar los usuarios de prueba.
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  super_admin: ALL_PERMISSIONS,
  operator: [
    'dashboard:view',
    'drivers:view',
    'trips:monitor',
    'trips:history',
    'alerts:view',
    'alerts:attend',
  ],
  verifier: ['dashboard:view', 'drivers:view', 'drivers:review', 'drivers:sensitive'],
  auditor: ['dashboard:view', 'audit:view', 'parameters:view', 'privacy:manage'],
};

export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  super_admin: 'Administración general',
  operator: 'Operación y monitoreo',
  verifier: 'Verificación de conductoras',
  auditor: 'Auditoría y privacidad',
};

export interface AdminUser {
  id: EntityId;
  fullName: string;
  email: string;
  role: Role;
  permissions: Permission[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * SUPUESTO: el backend devuelve un token de acceso de vida corta en el cuerpo y
 * guarda el token de renovación en una cookie httpOnly (no accesible desde JS).
 */
export interface LoginResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: AdminUser;
}

/* ---------- RF01: cuentas y consentimiento (entidades de referencia) ---------- */

export type ConsentScope = 'location' | 'biometric' | 'notifications' | 'trusted_contact_sharing';

export interface ConsentRecord {
  policyVersion: string;
  acceptedAt: ISODateString;
  /** Si no es null, el consentimiento fue retirado (RF13). */
  withdrawnAt: ISODateString | null;
  scopes: ConsentScope[];
}

export type AccountRole = 'passenger' | 'driver' | 'trusted_contact' | 'admin';

export interface Account {
  id: EntityId;
  role: AccountRole;
  /** Alias operativo; el portal no muestra más datos personales de los necesarios. */
  displayName: string;
  createdAt: ISODateString;
  consent: ConsentRecord | null;
}
