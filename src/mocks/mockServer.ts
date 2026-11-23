/**
 * Adaptador mock de la API REST. Imita el contrato descrito en
 * docs/api-contract-requests.md, incluidos permisos (403), validaciones (422) y auditoría.
 * NO es el backend: sirve para desarrollar y probar el portal sin él.
 */
import type { LoginResponse, Permission } from '../features/auth/auth.types';
import type { SensitiveAsset } from '../features/drivers/driver.types';
import {
  PRIVACY_TRANSITIONS,
  type ParameterKey,
  type PrivacyRequestStatus,
} from '../features/governance/audit.types';
import type { ResolutionOutcome } from '../features/incidents/alert.types';
import type { PublicTripView } from '../features/public-tracking/publicTracking.api';
import { isActiveTrip } from '../features/trips/trip.types';
import type { HttpMethod, TransportRequest, TransportResponse } from '../shared/api/client';
import type { ActorRef } from '../shared/types/common.types';
import { JUSTIFICATION_MIN_LENGTH, REASON_MIN_LENGTH } from '../shared/utils/validators';
import { addAudit, db, type MockUser } from './db';
import { broadcast, ensureSimulation } from './simulator';

const TOKEN_TTL_SECONDS = 300;
/** Simula la cookie httpOnly de renovación. No contiene ningún secreto real. */
const SESSION_KEY = 'mock.session';

class MockHttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function fail(status: number, code: string, message: string): never {
  throw new MockHttpError(status, code, message);
}

/* ---------- Sesión simulada ---------- */

function readSession(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSession(userId: string | null): void {
  try {
    if (userId) window.sessionStorage.setItem(SESSION_KEY, userId);
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Sin almacenamiento disponible: la sesión mock no sobrevive a una recarga.
  }
}

function issueSession(user: MockUser): LoginResponse {
  const expiresAt = Date.now() + TOKEN_TTL_SECONDS * 1000;
  return {
    accessToken: `mock.${user.id}.${expiresAt}`,
    expiresInSeconds: TOKEN_TTL_SECONDS,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      permissions: [...user.permissions],
    },
  };
}

function authenticate(token: string | null): MockUser | null {
  if (!token) return null;
  const [prefix, userId, expiresAt] = token.split('.');
  if (prefix !== 'mock' || Number(expiresAt) < Date.now()) return null;
  return db.users.find((item) => item.id === userId) ?? null;
}

/* ---------- Utilidades ---------- */

function text(body: unknown, key: string): string {
  if (typeof body !== 'object' || body === null) return '';
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : '';
}

function numeric(body: unknown, key: string): number {
  if (typeof body !== 'object' || body === null) return Number.NaN;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'number' ? value : Number.NaN;
}

interface Context {
  user: MockUser | null;
  params: string[];
  query: Record<string, string>;
  body: unknown;
}

function actorOf(context: Context): ActorRef {
  if (!context.user) fail(401, 'unauthorized', 'Sesión no válida.');
  return { id: context.user.id, name: context.user.fullName };
}

function param(context: Context, index = 0): string {
  return decodeURIComponent(context.params[index] ?? '');
}

function requireJustification(body: unknown): string {
  const justification = text(body, 'justification');
  if (justification.length < JUSTIFICATION_MIN_LENGTH) {
    fail(422, 'justification_required', 'La justificación de acceso es obligatoria.');
  }
  return justification;
}

function findDriver(id: string) {
  return (
    db.drivers.find((item) => item.id === id) ?? fail(404, 'not_found', 'Conductora no encontrada.')
  );
}

function findTrip(id: string) {
  return db.trips.find((item) => item.id === id) ?? fail(404, 'not_found', 'Viaje no encontrado.');
}

function findAlert(id: string) {
  return (
    db.alerts.find((item) => item.id === id) ?? fail(404, 'not_found', 'Alerta no encontrada.')
  );
}

/* ---------- Rutas ---------- */

interface Route {
  method: HttpMethod;
  pattern: RegExp;
  /** true: no exige sesión. */
  open?: boolean;
  permission?: Permission;
  handle: (context: Context) => unknown;
}

const OUTCOMES: readonly ResolutionOutcome[] = [
  'false_alarm',
  'contact_established',
  'help_channel_used',
  'other',
];

const routes: Route[] = [
  /* --- Autenticación --- */
  {
    method: 'POST',
    pattern: /^\/auth\/login$/,
    open: true,
    handle: ({ body }) => {
      const email = text(body, 'email').toLowerCase();
      const password = text(body, 'password');
      const user = db.users.find((item) => item.email === email && item.password === password);
      if (!user) fail(401, 'invalid_credentials', 'Correo o contraseña incorrectos.');
      writeSession(user.id);
      addAudit({ id: user.id, name: user.fullName }, 'auth.login', 'Sesión', user.id);
      return issueSession(user);
    },
  },
  {
    method: 'POST',
    pattern: /^\/auth\/refresh$/,
    open: true,
    handle: () => {
      const user = db.users.find((item) => item.id === readSession());
      if (!user) fail(401, 'session_expired', 'No hay una sesión activa.');
      return issueSession(user);
    },
  },
  {
    method: 'POST',
    pattern: /^\/auth\/logout$/,
    open: true,
    handle: () => {
      writeSession(null);
      return undefined;
    },
  },

  /* --- Conductoras --- */
  { method: 'GET', pattern: /^\/drivers$/, permission: 'drivers:view', handle: () => db.drivers },
  {
    method: 'GET',
    pattern: /^\/drivers\/([^/]+)$/,
    permission: 'drivers:view',
    handle: (context) => findDriver(param(context)),
  },
  {
    method: 'POST',
    pattern: /^\/drivers\/([^/]+)\/review$/,
    permission: 'drivers:review',
    handle: (context) => {
      const driver = findDriver(param(context));
      const actor = actorOf(context);
      const decision = text(context.body, 'decision');
      if (driver.status !== 'pending_review') {
        fail(409, 'already_reviewed', 'Esta solicitud ya fue revisada.');
      }
      if (decision === 'approve') {
        if (driver.identityVerification !== 'confirmed') {
          fail(
            409,
            'verification_not_confirmed',
            'No se puede aprobar: la verificación de identidad no está confirmada.',
          );
        }
        driver.status = 'approved';
        driver.rejectionReason = null;
        addAudit(actor, 'driver.approved', 'Conductora', driver.id);
      } else if (decision === 'reject') {
        const reason = text(context.body, 'reason');
        if (reason.length < REASON_MIN_LENGTH) {
          fail(422, 'reason_required', 'El motivo del rechazo es obligatorio.');
        }
        driver.status = 'rejected';
        driver.rejectionReason = reason;
        addAudit(actor, 'driver.rejected', 'Conductora', driver.id, null, `Motivo: ${reason}`);
      } else {
        fail(422, 'invalid_decision', 'Decisión no válida.');
      }
      driver.reviewedBy = actor;
      driver.reviewedAt = new Date().toISOString();
      return driver;
    },
  },
  {
    method: 'POST',
    pattern: /^\/drivers\/([^/]+)\/sensitive-assets$/,
    permission: 'drivers:sensitive',
    handle: (context) => {
      const driver = findDriver(param(context));
      const kind = text(context.body, 'kind');
      if (kind !== 'photo' && kind !== 'template')
        fail(422, 'invalid_kind', 'Tipo de dato no válido.');
      const justification = requireJustification(context.body);
      const entry = addAudit(
        actorOf(context),
        kind === 'photo' ? 'sensitive.photo_viewed' : 'sensitive.template_viewed',
        'Conductora',
        driver.id,
        justification,
      );
      const asset: SensitiveAsset = {
        kind,
        driverId: driver.id,
        contentUrl: null,
        description:
          kind === 'photo'
            ? 'Contenido simulado: aquí se mostraría la fotografía de referencia.'
            : 'Contenido simulado: aquí se mostrarían los metadatos de la plantilla biométrica.',
        auditEntryId: entry.id,
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      };
      return asset;
    },
  },

  /* --- Viajes --- */
  {
    method: 'GET',
    pattern: /^\/trips$/,
    permission: 'trips:monitor',
    handle: ({ query }) =>
      db.trips.filter((trip) =>
        query.scope === 'recent' ? !isActiveTrip(trip.status) : isActiveTrip(trip.status),
      ),
  },
  {
    method: 'GET',
    pattern: /^\/trips\/([^/]+)$/,
    permission: 'trips:monitor',
    handle: (context) => findTrip(param(context)),
  },
  {
    method: 'POST',
    pattern: /^\/trips\/([^/]+)\/position-history$/,
    permission: 'trips:history',
    handle: (context) => {
      const trip = findTrip(param(context));
      const justification = requireJustification(context.body);
      addAudit(actorOf(context), 'trip.history_viewed', 'Viaje', trip.id, justification);
      return db.positions[trip.id] ?? [];
    },
  },

  /* --- Alertas --- */
  { method: 'GET', pattern: /^\/alerts$/, permission: 'alerts:view', handle: () => db.alerts },
  {
    method: 'POST',
    pattern: /^\/alerts\/([^/]+)\/acknowledge$/,
    permission: 'alerts:attend',
    handle: (context) => {
      const alert = findAlert(param(context));
      const actor = actorOf(context);
      if (alert.status === 'open') {
        alert.status = 'acknowledged';
        alert.acknowledgedBy = actor;
        alert.acknowledgedAt = new Date().toISOString();
        addAudit(actor, 'alert.acknowledged', 'Alerta', alert.id);
        broadcast('alert.updated', { id: alert.id });
      }
      return alert;
    },
  },
  {
    method: 'POST',
    pattern: /^\/alerts\/([^/]+)\/resolve$/,
    permission: 'alerts:attend',
    handle: (context) => {
      const alert = findAlert(param(context));
      const actor = actorOf(context);
      const outcome = OUTCOMES.find((item) => item === text(context.body, 'outcome'));
      const notes = text(context.body, 'notes');
      if (!outcome) fail(422, 'invalid_outcome', 'Selecciona un resultado válido.');
      if (notes.length < REASON_MIN_LENGTH) {
        fail(422, 'notes_required', 'Las notas de resolución son obligatorias.');
      }
      if (alert.status === 'resolved')
        fail(409, 'already_resolved', 'La incidencia ya está resuelta.');
      const now = new Date().toISOString();
      if (!alert.acknowledgedBy) {
        alert.acknowledgedBy = actor;
        alert.acknowledgedAt = now;
      }
      alert.status = 'resolved';
      alert.resolution = { outcome, notes, resolvedBy: actor, resolvedAt: now };
      addAudit(actor, 'alert.resolved', 'Alerta', alert.id, null, `Resultado: ${outcome}`);
      broadcast('alert.updated', { id: alert.id });
      return alert;
    },
  },

  /* --- Parámetros --- */
  { method: 'GET', pattern: /^\/parameters$/, handle: () => db.parameters },
  {
    method: 'GET',
    pattern: /^\/parameters\/([^/]+)\/versions$/,
    permission: 'parameters:view',
    handle: (context) =>
      db.parameterVersions
        .filter((item) => item.key === (param(context) as ParameterKey))
        .sort((a, b) => b.version - a.version),
  },
  {
    method: 'PUT',
    pattern: /^\/parameters\/([^/]+)$/,
    permission: 'parameters:edit',
    handle: (context) => {
      const parameter =
        db.parameters.find((item) => item.key === param(context)) ??
        fail(404, 'not_found', 'Parámetro no encontrado.');
      const actor = actorOf(context);
      const value = numeric(context.body, 'value');
      const reason = text(context.body, 'reason');
      if (!Number.isInteger(value) || value < parameter.min || value > parameter.max) {
        fail(
          422,
          'invalid_value',
          `El valor debe estar entre ${parameter.min} y ${parameter.max}.`,
        );
      }
      if (reason.length < REASON_MIN_LENGTH) {
        fail(422, 'reason_required', 'El motivo del cambio es obligatorio.');
      }
      if (value === parameter.value) {
        fail(422, 'same_value', 'El valor nuevo es igual al vigente.');
      }
      const now = new Date().toISOString();
      db.parameterVersions.push({
        key: parameter.key,
        version: parameter.version + 1,
        previousValue: parameter.value,
        newValue: value,
        changedBy: actor,
        changedAt: now,
        reason,
      });
      addAudit(
        actor,
        'parameter.updated',
        'Parámetro',
        parameter.key,
        null,
        `${parameter.value} ${parameter.unit} → ${value} ${parameter.unit}. Motivo: ${reason}`,
      );
      parameter.value = value;
      parameter.version += 1;
      parameter.updatedAt = now;
      parameter.updatedBy = actor;
      return parameter;
    },
  },

  /* --- Auditoría y privacidad --- */
  { method: 'GET', pattern: /^\/audit-log$/, permission: 'audit:view', handle: () => db.audit },
  {
    method: 'GET',
    pattern: /^\/privacy-requests$/,
    permission: 'privacy:manage',
    handle: () => db.privacyRequests,
  },
  {
    method: 'POST',
    pattern: /^\/privacy-requests\/([^/]+)\/status$/,
    permission: 'privacy:manage',
    handle: (context) => {
      const request =
        db.privacyRequests.find((item) => item.id === param(context)) ??
        fail(404, 'not_found', 'Solicitud no encontrada.');
      const actor = actorOf(context);
      const status = text(context.body, 'status') as PrivacyRequestStatus;
      const note = text(context.body, 'note');
      if (!PRIVACY_TRANSITIONS[request.status].includes(status)) {
        fail(409, 'invalid_transition', 'La solicitud no puede pasar a ese estado.');
      }
      if (note.length < REASON_MIN_LENGTH) fail(422, 'note_required', 'La nota es obligatoria.');
      request.status = status;
      request.history.push({ at: new Date().toISOString(), actor: actor.name, status, note });
      addAudit(
        actor,
        'privacy.status_changed',
        'Solicitud de datos',
        request.id,
        null,
        `Nuevo estado: ${status}`,
      );
      return request;
    },
  },

  /* --- Vista pública --- */
  {
    method: 'GET',
    pattern: /^\/public\/track\/([^/]+)$/,
    open: true,
    handle: (context) => {
      const link = db.shareLinks.find((item) => item.token === param(context));
      if (!link) fail(404, 'link_not_found', 'El enlace no es válido.');
      if (link.revokedAt) fail(410, 'link_revoked', 'El enlace fue revocado.');
      if (Date.parse(link.expiresAt) <= Date.now()) fail(410, 'link_expired', 'El enlace expiró.');
      ensureSimulation();
      const trip = findTrip(link.tripId);
      const position = trip.lastPosition;
      const view: PublicTripView = {
        tripStatus: trip.status,
        lastPosition: position
          ? {
              id: position.id,
              lat: position.lat,
              lng: position.lng,
              accuracyMeters: position.accuracyMeters,
              deviceTimestamp: position.deviceTimestamp,
              serverTimestamp: position.serverTimestamp,
            }
          : null,
        expiresAt: link.expiresAt,
        signalLossThresholdSeconds:
          db.parameters.find((item) => item.key === 'signal_loss_seconds')?.value ?? 0,
      };
      return view;
    },
  },
];

function errorResponse(status: number, code: string, message: string): TransportResponse {
  return { status, body: { code, message } };
}

export async function handleMockRequest(request: TransportRequest): Promise<TransportResponse> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  if (request.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  for (const route of routes) {
    if (route.method !== request.method) continue;
    const match = route.pattern.exec(request.path);
    if (!match) continue;

    const user = authenticate(request.token);
    if (!route.open) {
      if (!user)
        return errorResponse(401, 'unauthorized', 'Tu sesión expiró. Inicia sesión de nuevo.');
      if (route.permission && !user.permissions.includes(route.permission)) {
        return errorResponse(403, 'forbidden', 'No tienes permiso para realizar esta acción.');
      }
    }

    try {
      const body = route.handle({
        user,
        params: match.slice(1),
        query: request.query ?? {},
        body: request.body,
      });
      // Se clona para que el portal nunca comparta referencias con la "base de datos".
      return body === undefined
        ? { status: 204, body: null }
        : { status: 200, body: structuredClone(body) };
    } catch (error) {
      if (error instanceof MockHttpError) {
        return errorResponse(error.status, error.code, error.message);
      }
      throw error;
    }
  }
  return errorResponse(404, 'not_found', 'Ruta no implementada en el adaptador mock.');
}
