/**
 * Datos de prueba en memoria del adaptador mock. Todo es ficticio.
 * Se reinician al recargar la página. No se usa cuando VITE_USE_MOCKS=false.
 */
import { ROLE_PERMISSIONS, type AdminUser, type Role } from '../features/auth/auth.types';
import type {
  DriverDetail,
  DriverStatus,
  Verification,
  VerificationKind,
  VerificationStatus,
} from '../features/drivers/driver.types';
import type {
  AuditAction,
  AuditEntry,
  Parameter,
  ParameterVersion,
  PrivacyRequest,
  ShareLink,
} from '../features/governance/audit.types';
import type { Alert } from '../features/incidents/alert.types';
import type { Position, TripDetail, TripStatus } from '../features/trips/trip.types';
import type { ActorRef, LatLng } from '../shared/types/common.types';
import { polylineLengthMeters } from '../shared/utils/geo.utils';

export interface MockUser extends AdminUser {
  password: string;
}

/** Contraseña única de los usuarios de prueba. Solo existe en el mock. */
export const MOCK_PASSWORD = 'Piloto-2026';

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const daysAgo = (days: number) => minutesAgo(days * 1440);
const inMinutes = (minutes: number) => minutesAgo(-minutes);

let sequence = 1000;
export function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

/* ---------- Usuarios ---------- */

function user(id: string, fullName: string, email: string, role: Role): MockUser {
  return {
    id,
    fullName,
    email,
    role,
    permissions: [...ROLE_PERMISSIONS[role]],
    password: MOCK_PASSWORD,
  };
}

const users: MockUser[] = [
  user('U-1', 'Andrea Salcedo', 'admin@piloto.test', 'super_admin'),
  user('U-2', 'Natalia Cárdenas', 'operadora@piloto.test', 'operator'),
  user('U-3', 'Viviana Torres', 'verificadora@piloto.test', 'verifier'),
  user('U-4', 'Mónica Rueda', 'auditora@piloto.test', 'auditor'),
];

const systemActor: ActorRef = { id: 'system', name: 'Sistema' };
const adminActor: ActorRef = { id: 'U-1', name: 'Andrea Salcedo' };

/* ---------- Conductoras ---------- */

function verification(
  id: string,
  driverId: string,
  kind: VerificationKind,
  status: VerificationStatus,
  overrides: Partial<Verification> = {},
): Verification {
  const completed = status === 'confirmed' || status === 'failed';
  return {
    id,
    driverId,
    kind,
    status,
    result: status === 'confirmed' ? 'match' : status === 'failed' ? 'no_match' : null,
    score: status === 'confirmed' ? 0.93 : status === 'failed' ? 0.41 : null,
    threshold: 0.8,
    modelVersion: 'face-match-1.2.0',
    livenessStatus: completed ? 'passed' : 'not_performed',
    requestedAt: daysAgo(2),
    completedAt: completed ? daysAgo(2) : null,
    dueAt: null,
    ...overrides,
  };
}

function driver(
  id: string,
  fullName: string,
  status: DriverStatus,
  identityVerification: VerificationStatus,
  plate: string,
  verifications: Verification[],
  overrides: Partial<DriverDetail> = {},
): DriverDetail {
  return {
    id,
    fullName,
    documentNumberMasked: `CC ··· ${id.slice(-2)}47`,
    phoneMasked: `··· ··· 48${id.slice(-2)}`,
    status,
    registeredAt: daysAgo(12),
    vehicle: { plate, model: 'Renault Kwid 2022', color: 'Gris' },
    identityVerification,
    rejectionReason: null,
    reviewedBy: status === 'approved' ? adminActor : null,
    reviewedAt: status === 'approved' ? daysAgo(8) : null,
    consent: {
      policyVersion: 'v1.0',
      acceptedAt: daysAgo(12),
      withdrawnAt: null,
      scopes: ['location', 'biometric', 'notifications'],
    },
    verifications,
    biometricReference: {
      id: `BR-${id}`,
      driverId: id,
      createdAt: daysAgo(12),
      modelVersion: 'face-match-1.2.0',
      hasPhoto: true,
      hasTemplate: true,
    },
    documents: [
      {
        id: `${id}-doc-1`,
        label: 'Licencia de conducción',
        status: 'valid',
        expiresAt: inMinutes(400_000),
      },
      { id: `${id}-doc-2`, label: 'SOAT', status: 'valid', expiresAt: inMinutes(200_000) },
      {
        id: `${id}-doc-3`,
        label: 'Revisión técnico-mecánica',
        status: 'valid',
        expiresAt: inMinutes(150_000),
      },
    ],
    ...overrides,
  };
}

const drivers: DriverDetail[] = [
  driver('D-01', 'Laura Méndez Rojas', 'pending_review', 'confirmed', 'KLM 421', [
    verification('V-011', 'D-01', 'enrollment', 'confirmed'),
  ]),
  driver('D-02', 'Diana Pardo Suárez', 'approved', 'confirmed', 'HTR 908', [
    verification('V-022', 'D-02', 'periodic', 'confirmed', {
      requestedAt: daysAgo(1),
      completedAt: daysAgo(1),
    }),
    verification('V-021', 'D-02', 'enrollment', 'confirmed', {
      requestedAt: daysAgo(10),
      completedAt: daysAgo(10),
    }),
  ]),
  driver('D-03', 'Yuliana Ortiz Peña', 'approved', 'expired', 'JPQ 337', [
    verification('V-032', 'D-03', 'periodic', 'expired', {
      requestedAt: daysAgo(3),
      dueAt: daysAgo(1),
    }),
    verification('V-031', 'D-03', 'enrollment', 'confirmed', {
      requestedAt: daysAgo(11),
      completedAt: daysAgo(11),
    }),
  ]),
  driver('D-04', 'Carolina Vega Ruiz', 'approved', 'failed', 'MNB 152', [
    verification('V-042', 'D-04', 'pre_trip', 'failed', {
      requestedAt: minutesAgo(50),
      completedAt: minutesAgo(50),
      livenessStatus: 'failed',
      result: 'inconclusive',
      score: null,
    }),
    verification('V-041', 'D-04', 'enrollment', 'confirmed', {
      requestedAt: daysAgo(9),
      completedAt: daysAgo(9),
    }),
  ]),
  driver('D-05', 'Paola Rincón Díaz', 'pending_review', 'pending', 'RZT 664', [
    verification('V-051', 'D-05', 'enrollment', 'pending', { requestedAt: daysAgo(1) }),
  ]),
  driver(
    'D-06',
    'Marcela Gómez Ardila',
    'rejected',
    'deferred',
    'BQS 219',
    [verification('V-061', 'D-06', 'enrollment', 'deferred', { requestedAt: daysAgo(6) })],
    {
      rejectionReason: 'La revisión técnico-mecánica del vehículo está vencida.',
      reviewedBy: adminActor,
      reviewedAt: daysAgo(5),
    },
  ),
];

/* ---------- Viajes ---------- */

function densify(waypoints: LatLng[], perSegment: number): LatLng[] {
  const points: LatLng[] = [];
  for (let i = 1; i < waypoints.length; i += 1) {
    const a = waypoints[i - 1];
    const b = waypoints[i];
    if (!a || !b) continue;
    for (let step = 0; step < perSegment; step += 1) {
      const t = step / perSegment;
      points.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });
    }
  }
  const last = waypoints[waypoints.length - 1];
  if (last) points.push(last);
  return points;
}

let positionSequence = 0;
export function makePosition(tripId: string, point: LatLng, ageMs = 0): Position {
  positionSequence += 1;
  const now = Date.now() - ageMs;
  return {
    id: `P-${positionSequence}`,
    tripId,
    lat: point.lat,
    lng: point.lng,
    deviceTimestamp: new Date(now - 450 - Math.floor(Math.random() * 400)).toISOString(),
    serverTimestamp: new Date(now - 60 - Math.floor(Math.random() * 90)).toISOString(),
    accuracyMeters: 6 + Math.floor(Math.random() * 9),
    speedKmh: 24 + Math.floor(Math.random() * 14),
  };
}

function trip(
  id: string,
  status: TripStatus,
  driverId: string,
  passengerAlias: string,
  originLabel: string,
  destinationLabel: string,
  routePoints: LatLng[],
  overrides: Partial<TripDetail> = {},
): TripDetail {
  const assigned = drivers.find((item) => item.id === driverId);
  const origin = routePoints[0] ?? { lat: 0, lng: 0 };
  const destination = routePoints[routePoints.length - 1] ?? origin;
  return {
    id,
    status,
    passengerAlias,
    driverId,
    driverName: assigned?.fullName ?? 'Sin asignar',
    driverVerification: assigned?.identityVerification ?? 'pending',
    origin: { ...origin, label: originLabel },
    destination: { ...destination, label: destinationLabel },
    requestedAt: minutesAgo(22),
    startedAt: minutesAgo(14),
    endedAt: null,
    route: {
      id: `R-${id}`,
      version: 1,
      points: routePoints,
      distanceMeters: Math.round(polylineLengthMeters(routePoints)),
      authorizedChanges: [],
    },
    lastPosition: null,
    activeDeviation: null,
    activeStop: null,
    anomalyIndex: null,
    shareLinkActive: false,
    statusHistory: [
      { id: `${id}-s1`, from: null, to: 'requested', at: minutesAgo(22), actor: passengerAlias },
      {
        id: `${id}-s2`,
        from: 'requested',
        to: 'accepted',
        at: minutesAgo(20),
        actor: 'Conductora',
      },
      {
        id: `${id}-s3`,
        from: 'accepted',
        to: 'driver_arriving',
        at: minutesAgo(19),
        actor: 'Sistema',
      },
      {
        id: `${id}-s4`,
        from: 'driver_arriving',
        to: 'in_progress',
        at: minutesAgo(14),
        actor: 'Conductora',
      },
    ],
    ...overrides,
  };
}

const routeA = densify(
  [
    { lat: 7.1193, lng: -73.1227 },
    { lat: 7.1139, lng: -73.1105 },
    { lat: 7.1066, lng: -73.1085 },
  ],
  14,
);
const routeB = densify(
  [
    { lat: 7.1254, lng: -73.1198 },
    { lat: 7.13, lng: -73.129 },
    { lat: 7.137, lng: -73.133 },
  ],
  14,
);
const routeC = densify(
  [
    { lat: 7.099, lng: -73.107 },
    { lat: 7.09, lng: -73.11 },
    { lat: 7.072, lng: -73.105 },
  ],
  10,
);

/** Recorrido real simulado del viaje B: se aparta progresivamente de la ruta de referencia. */
const driftedPathB = routeB.map((point, index) => {
  const drift = Math.min(0.0026, Math.max(0, index - 9) * 0.0003);
  return { lat: point.lat - drift, lng: point.lng + drift };
});

export interface SimulationState {
  path: LatLng[];
  index: number;
  direction: 1 | -1;
  minIndex: number;
}

/** Viajes que el simulador mueve. El viaje T-1003 no está: simula pérdida de señal. */
export const simulation: Record<string, SimulationState> = {
  'T-1001': { path: routeA, index: 3, direction: 1, minIndex: 0 },
  'T-1002': { path: driftedPathB, index: 16, direction: 1, minIndex: 14 },
};

const startA = routeA[3] ?? { lat: 7.1193, lng: -73.1227 };
const startB = driftedPathB[16] ?? { lat: 7.13, lng: -73.129 };
const startC = routeC[6] ?? { lat: 7.09, lng: -73.11 };

const trips: TripDetail[] = [
  trip(
    'T-1001',
    'in_progress',
    'D-02',
    'Pasajera 1042',
    'Parque Santander',
    'Cabecera del Llano',
    routeA,
    {
      lastPosition: makePosition('T-1001', startA),
      shareLinkActive: true,
      anomalyIndex: 8,
    },
  ),
  trip(
    'T-1002',
    'in_progress',
    'D-03',
    'Pasajera 0877',
    'San Francisco',
    'Norte, vía al Café Madrid',
    routeB,
    {
      lastPosition: makePosition('T-1002', startB),
      activeDeviation: { meters: 320, since: minutesAgo(3) },
      anomalyIndex: 62,
      route: {
        id: 'R-T-1002',
        version: 2,
        points: routeB,
        distanceMeters: Math.round(polylineLengthMeters(routeB)),
        authorizedChanges: [
          {
            id: 'RC-1',
            authorizedAt: minutesAgo(12),
            authorizedBy: 'passenger',
            reason: 'Cambio de destino solicitado por la pasajera al iniciar el viaje.',
          },
        ],
      },
    },
  ),
  trip(
    'T-1003',
    'in_progress',
    'D-04',
    'Pasajera 1190',
    'Provenza',
    'Floridablanca centro',
    routeC,
    {
      // Última posición de hace 95 s: debe verse como dato antiguo y "sin señal".
      lastPosition: makePosition('T-1003', startC, 95_000),
      anomalyIndex: 35,
    },
  ),
  trip(
    'T-0990',
    'completed',
    'D-02',
    'Pasajera 0412',
    'UTS sede principal',
    'Real de Minas',
    routeA,
    {
      requestedAt: minutesAgo(190),
      startedAt: minutesAgo(180),
      endedAt: minutesAgo(155),
      lastPosition: makePosition('T-0990', routeA[routeA.length - 1] ?? startA, 155 * 60_000),
      statusHistory: [
        {
          id: 'T-0990-s1',
          from: null,
          to: 'requested',
          at: minutesAgo(190),
          actor: 'Pasajera 0412',
        },
        {
          id: 'T-0990-s2',
          from: 'requested',
          to: 'accepted',
          at: minutesAgo(188),
          actor: 'Conductora',
        },
        {
          id: 'T-0990-s3',
          from: 'accepted',
          to: 'driver_arriving',
          at: minutesAgo(187),
          actor: 'Sistema',
        },
        {
          id: 'T-0990-s4',
          from: 'driver_arriving',
          to: 'in_progress',
          at: minutesAgo(180),
          actor: 'Conductora',
        },
        {
          id: 'T-0990-s5',
          from: 'in_progress',
          to: 'completed',
          at: minutesAgo(155),
          actor: 'Conductora',
        },
      ],
    },
  ),
  trip('T-0989', 'cancelled', 'D-03', 'Pasajera 0655', 'Cañaveral', 'Girón', routeC, {
    requestedAt: minutesAgo(260),
    startedAt: null,
    endedAt: minutesAgo(255),
    statusHistory: [
      { id: 'T-0989-s1', from: null, to: 'requested', at: minutesAgo(260), actor: 'Pasajera 0655' },
      {
        id: 'T-0989-s2',
        from: 'requested',
        to: 'cancelled',
        at: minutesAgo(255),
        actor: 'Pasajera 0655',
      },
    ],
  }),
];

const positions: Record<string, Position[]> = {
  'T-0990': routeA.map((point, index) => makePosition('T-0990', point, (180 - index) * 60_000)),
};
for (const item of trips) {
  if (item.lastPosition && !positions[item.id]) positions[item.id] = [item.lastPosition];
}

/* ---------- Alertas ---------- */

const alerts: Alert[] = [
  {
    id: 'A-5001',
    tripId: 'T-1002',
    type: 'route_deviation',
    severity: 'high',
    status: 'open',
    createdAt: minutesAgo(3),
    silent: false,
    summary: 'El vehículo se apartó de la ruta de referencia por encima del umbral configurado.',
    anomaly: {
      index: 62,
      level: 'medium',
      computedAt: minutesAgo(1),
      modelVersion: 'anomaly-rules-0.3',
      factors: [
        {
          code: 'route_deviation',
          label: 'Desviación de la ruta de referencia',
          description:
            'Distancia entre la posición actual y el punto más cercano de la ruta acordada.',
          observed: '320 m',
          weight: 0.45,
          contribution: 30,
        },
        {
          code: 'driver_verification',
          label: 'Verificación de la conductora no vigente',
          description: 'La última verificación periódica de identidad venció y está pendiente.',
          observed: 'Vencida hace 1 día',
          weight: 0.3,
          contribution: 20,
        },
        {
          code: 'signal_gaps',
          label: 'Intermitencia de señal GPS',
          description: 'Tiempo acumulado sin posiciones durante el viaje.',
          observed: '22 s acumulados',
          weight: 0.15,
          contribution: 12,
        },
        {
          code: 'prolonged_stop',
          label: 'Parada prolongada',
          description: 'Tiempo detenido fuera del origen y del destino.',
          observed: 'Sin paradas',
          weight: 0.1,
          contribution: 0,
        },
      ],
    },
    deliveries: [
      {
        id: 'DL-1',
        channel: 'admin_portal',
        destination: 'Portal de administración',
        attempts: 1,
        lastAttemptAt: minutesAgo(3),
        status: 'delivered',
        confirmedAt: minutesAgo(3),
      },
      {
        id: 'DL-2',
        channel: 'push',
        destination: 'Contacto de confianza ···4821',
        attempts: 2,
        lastAttemptAt: minutesAgo(2),
        status: 'sent',
        confirmedAt: null,
      },
    ],
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolution: null,
  },
  {
    id: 'A-4990',
    tripId: 'T-0990',
    type: 'prolonged_stop',
    severity: 'medium',
    status: 'resolved',
    createdAt: minutesAgo(170),
    silent: false,
    summary: 'El vehículo permaneció detenido más tiempo que el umbral configurado.',
    anomaly: null,
    deliveries: [
      {
        id: 'DL-3',
        channel: 'admin_portal',
        destination: 'Portal de administración',
        attempts: 1,
        lastAttemptAt: minutesAgo(170),
        status: 'delivered',
        confirmedAt: minutesAgo(170),
      },
      {
        id: 'DL-4',
        channel: 'sms',
        destination: 'Contacto de confianza ···1175',
        attempts: 3,
        lastAttemptAt: minutesAgo(166),
        status: 'failed',
        confirmedAt: null,
      },
    ],
    acknowledgedBy: { id: 'U-2', name: 'Natalia Cárdenas' },
    acknowledgedAt: minutesAgo(168),
    resolution: {
      outcome: 'contact_established',
      notes: 'Se contactó a la pasajera: parada para recoger un paquete. El viaje continuó.',
      resolvedBy: { id: 'U-2', name: 'Natalia Cárdenas' },
      resolvedAt: minutesAgo(160),
    },
  },
];

/* ---------- Parámetros versionados ---------- */

// SUPUESTO: valores iniciales 100 m / 30 s / 180 s tomados del diseño; pendientes de
// confirmar con el SRS. Son datos del mock, no constantes del portal.
const parameters: Parameter[] = [
  {
    key: 'route_deviation_meters',
    label: 'Umbral de desviación de ruta',
    description:
      'Distancia a la ruta de referencia a partir de la cual se registra una desviación.',
    unit: 'm',
    value: 100,
    min: 20,
    max: 1000,
    version: 1,
    updatedAt: daysAgo(20),
    updatedBy: adminActor,
  },
  {
    key: 'signal_loss_seconds',
    label: 'Umbral de pérdida de señal',
    description: 'Tiempo sin recibir posiciones a partir del cual el viaje se marca sin señal.',
    unit: 's',
    value: 30,
    min: 10,
    max: 300,
    version: 1,
    updatedAt: daysAgo(20),
    updatedBy: adminActor,
  },
  {
    key: 'prolonged_stop_seconds',
    label: 'Umbral de parada prolongada',
    description: 'Tiempo detenido a partir del cual se registra una parada prolongada.',
    unit: 's',
    value: 180,
    min: 30,
    max: 1800,
    version: 1,
    updatedAt: daysAgo(20),
    updatedBy: adminActor,
  },
];

const parameterVersions: ParameterVersion[] = parameters.map((parameter) => ({
  key: parameter.key,
  version: 1,
  previousValue: null,
  newValue: parameter.value,
  changedBy: adminActor,
  changedAt: parameter.updatedAt,
  reason: 'Valor inicial del piloto según el documento de diseño.',
}));

/* ---------- Auditoría ---------- */

const audit: AuditEntry[] = [
  {
    id: 'AU-903',
    at: minutesAgo(160),
    actor: { id: 'U-2', name: 'Natalia Cárdenas' },
    action: 'alert.resolved',
    resourceType: 'Alerta',
    resourceId: 'A-4990',
    justification: null,
    detail: 'Resultado: contacto establecido.',
  },
  {
    id: 'AU-902',
    at: daysAgo(5),
    actor: adminActor,
    action: 'driver.rejected',
    resourceType: 'Conductora',
    resourceId: 'D-06',
    justification: null,
    detail: 'Motivo: La revisión técnico-mecánica del vehículo está vencida.',
  },
  {
    id: 'AU-901',
    at: daysAgo(6),
    actor: { id: 'U-3', name: 'Viviana Torres' },
    action: 'sensitive.photo_viewed',
    resourceType: 'Conductora',
    resourceId: 'D-06',
    justification: 'Revisión manual de la solicitud por foto de referencia borrosa.',
    detail: null,
  },
];

export function addAudit(
  actor: ActorRef,
  action: AuditAction,
  resourceType: string,
  resourceId: string,
  justification: string | null = null,
  detail: string | null = null,
): AuditEntry {
  const entry: AuditEntry = {
    id: nextId('AU'),
    at: new Date().toISOString(),
    actor,
    action,
    resourceType,
    resourceId,
    justification,
    detail,
  };
  audit.unshift(entry);
  return entry;
}

/* ---------- Solicitudes de datos personales ---------- */

const privacyRequests: PrivacyRequest[] = [
  {
    id: 'PR-301',
    type: 'access',
    subjectAlias: 'Pasajera 0412',
    subjectRole: 'passenger',
    status: 'received',
    createdAt: daysAgo(1),
    dueAt: inMinutes(9 * 1440),
    history: [
      {
        at: daysAgo(1),
        actor: 'Pasajera 0412',
        status: 'received',
        note: 'Solicitud creada desde la app.',
      },
    ],
  },
  {
    id: 'PR-302',
    type: 'deletion',
    subjectAlias: 'Conductora D-06',
    subjectRole: 'driver',
    status: 'in_review',
    createdAt: daysAgo(4),
    dueAt: inMinutes(11 * 1440),
    history: [
      {
        at: daysAgo(4),
        actor: 'Conductora D-06',
        status: 'received',
        note: 'Solicitud creada desde la app.',
      },
      {
        at: daysAgo(3),
        actor: 'Mónica Rueda',
        status: 'in_review',
        note: 'Se valida si existen obligaciones de conservación.',
      },
    ],
  },
  {
    id: 'PR-303',
    type: 'consent_withdrawal',
    subjectAlias: 'Contacto de confianza ···1175',
    subjectRole: 'trusted_contact',
    status: 'completed',
    createdAt: daysAgo(9),
    dueAt: daysAgo(-1),
    history: [
      {
        at: daysAgo(9),
        actor: 'Contacto de confianza',
        status: 'received',
        note: 'Solicitud creada desde el enlace.',
      },
      {
        at: daysAgo(8),
        actor: 'Mónica Rueda',
        status: 'in_review',
        note: 'Identidad del solicitante confirmada.',
      },
      {
        at: daysAgo(7),
        actor: 'Mónica Rueda',
        status: 'completed',
        note: 'Consentimiento retirado y notificaciones desactivadas.',
      },
    ],
  },
];

/* ---------- Enlaces de seguimiento ---------- */

export const DEMO_TOKENS = {
  active: 'demo-activo-7f3a9c21',
  expired: 'demo-expirado-b81d04e6',
  revoked: 'demo-revocado-2c9e55aa',
} as const;

const shareLinks: ShareLink[] = [
  {
    token: DEMO_TOKENS.active,
    tripId: 'T-1001',
    createdAt: minutesAgo(14),
    expiresAt: inMinutes(60),
    revokedAt: null,
  },
  {
    token: DEMO_TOKENS.expired,
    tripId: 'T-0990',
    createdAt: minutesAgo(180),
    expiresAt: minutesAgo(120),
    revokedAt: null,
  },
  {
    token: DEMO_TOKENS.revoked,
    tripId: 'T-1002',
    createdAt: minutesAgo(12),
    expiresAt: inMinutes(60),
    revokedAt: minutesAgo(5),
  },
];

export const db = {
  users,
  systemActor,
  drivers,
  trips,
  positions,
  alerts,
  parameters,
  parameterVersions,
  audit,
  privacyRequests,
  shareLinks,
};
