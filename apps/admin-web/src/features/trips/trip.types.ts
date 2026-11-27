import type { EntityId, ISODateString, LatLng } from '../../shared/types/common.types';
import type { VerificationStatus } from '../drivers/driver.types';

/** SUPUESTO: conjunto de estados de viaje; el documento exige transiciones válidas (RF03). */
export type TripStatus =
  | 'requested'
  | 'accepted'
  | 'driver_arriving'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/** SUPUESTO: tabla de transiciones válidas. El backend es quien las hace cumplir. */
export const TRIP_TRANSITIONS: Readonly<Record<TripStatus, readonly TripStatus[]>> = {
  requested: ['accepted', 'cancelled'],
  accepted: ['driver_arriving', 'cancelled'],
  driver_arriving: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function canTransition(from: TripStatus, to: TripStatus): boolean {
  return TRIP_TRANSITIONS[from].includes(to);
}

export const TRIP_STATUS_LABELS: Readonly<Record<TripStatus, string>> = {
  requested: 'Solicitado',
  accepted: 'Aceptado',
  driver_arriving: 'Conductora en camino',
  in_progress: 'En curso',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

export function isActiveTrip(status: TripStatus): boolean {
  return status === 'accepted' || status === 'driver_arriving' || status === 'in_progress';
}

/** Posición GPS (RF07). Lleva los dos instantes para poder medir latencia (RNF03). */
export interface Position extends LatLng {
  /** Identificador único: permite descartar duplicados tras una reconexión (RNF04). */
  id: EntityId;
  tripId: EntityId;
  /** Instante en que el dispositivo tomó la muestra. */
  deviceTimestamp: ISODateString;
  /** Instante en que el servidor la recibió. */
  serverTimestamp: ISODateString;
  accuracyMeters: number;
  speedKmh: number | null;
}

/** Posición recibida en vivo, con el instante local de recepción (reloj del navegador). */
export interface ReceivedPosition extends Position {
  clientReceivedAt: number;
}

export interface RouteChange {
  id: EntityId;
  authorizedAt: ISODateString;
  /** SUPUESTO: quién puede autorizar un cambio de ruta (RF06). */
  authorizedBy: 'passenger' | 'admin';
  reason: string;
}

export interface ReferenceRoute {
  id: EntityId;
  version: number;
  points: LatLng[];
  distanceMeters: number;
  authorizedChanges: RouteChange[];
}

/** SUPUESTO: el backend calcula y entrega la desviación y la parada vigentes (RF07). */
export interface TripDeviation {
  meters: number;
  since: ISODateString;
}

export interface TripStop {
  since: ISODateString;
}

export interface TripPlace extends LatLng {
  label: string;
}

export interface Trip {
  id: EntityId;
  status: TripStatus;
  /** Alias operativo de la pasajera; el portal no necesita su nombre para monitorear. */
  passengerAlias: string;
  driverId: EntityId;
  driverName: string;
  driverVerification: VerificationStatus;
  origin: TripPlace;
  destination: TripPlace;
  requestedAt: ISODateString;
  startedAt: ISODateString | null;
  endedAt: ISODateString | null;
  route: ReferenceRoute;
  /** Última posición conocida. Puede ser antigua: mostrar siempre su hora. */
  lastPosition: Position | null;
  activeDeviation: TripDeviation | null;
  activeStop: TripStop | null;
  /** Índice operativo de anomalía 0..100 (no es probabilidad de delito). */
  anomalyIndex: number | null;
  shareLinkActive: boolean;
}

export interface TripStatusChange {
  id: EntityId;
  from: TripStatus | null;
  to: TripStatus;
  at: ISODateString;
  actor: string;
}

export interface TripDetail extends Trip {
  statusHistory: TripStatusChange[];
}

export type TripScope = 'active' | 'recent';

/** Instante de referencia para el watchdog: recepción local si existe, si no la del servidor. */
export function positionReceivedAt(position: Position | ReceivedPosition): number {
  if ('clientReceivedAt' in position) return position.clientReceivedAt;
  return Date.parse(position.serverTimestamp);
}
