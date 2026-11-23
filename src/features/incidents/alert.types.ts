import type { ActorRef, EntityId, ISODateString } from '../../shared/types/common.types';

/** SUPUESTO: catálogo de tipos de alerta (RF09). */
export type AlertType =
  | 'silent_alert'
  | 'help_button'
  | 'route_deviation'
  | 'prolonged_stop'
  | 'signal_loss'
  | 'verification_failed'
  | 'anomaly_index';

export type AlertSeverity = 'critical' | 'high' | 'medium';

/**
 * `open`: nadie ha registrado atención (permanece en el banner).
 * `acknowledged`: una persona administradora registró que la atiende.
 * `resolved`: incidencia cerrada con resolución.
 */
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

/** Factor que compone el índice operativo de anomalía (RF08). */
export interface AnomalyFactor {
  code: string;
  label: string;
  /** Explicación en lenguaje llano de qué mide el factor. */
  description: string;
  /** Valor observado, ya formateado con su unidad (p. ej. "260 m"). */
  observed: string;
  /** Peso relativo del factor en el modelo, 0..1. */
  weight: number;
  /** Puntos que aporta al índice (la suma de aportes debe igualar el índice). */
  contribution: number;
}

export type AnomalyLevel = 'low' | 'medium' | 'high';

/**
 * Índice operativo de anomalía. Resume señales operativas del viaje.
 * NO es una probabilidad de delito ni una predicción sobre personas.
 */
export interface AnomalyAssessment {
  /** 0..100 */
  index: number;
  /** SUPUESTO: el backend entrega el nivel; el portal no fija cortes propios. */
  level: AnomalyLevel;
  computedAt: ISODateString;
  modelVersion: string;
  factors: AnomalyFactor[];
}

export type DeliveryChannel = 'push' | 'sms' | 'admin_portal';

/** `delivered` solo es válido con `confirmedAt` informado por el backend (RNF03). */
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface AlertDelivery {
  id: EntityId;
  channel: DeliveryChannel;
  /** Destino descrito sin datos personales de más (p. ej. "Contacto de confianza ···4821"). */
  destination: string;
  attempts: number;
  lastAttemptAt: ISODateString | null;
  status: DeliveryStatus;
  confirmedAt: ISODateString | null;
}

export type ResolutionOutcome =
  | 'false_alarm'
  | 'contact_established'
  | 'help_channel_used'
  | 'other';

export interface IncidentResolution {
  outcome: ResolutionOutcome;
  notes: string;
  resolvedBy: ActorRef;
  resolvedAt: ISODateString;
}

export interface ResolveAlertRequest {
  outcome: ResolutionOutcome;
  notes: string;
}

export interface Alert {
  id: EntityId;
  tripId: EntityId;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: ISODateString;
  /** Alerta silenciosa: no se notifica en el dispositivo de la conductora. */
  silent: boolean;
  summary: string;
  anomaly: AnomalyAssessment | null;
  deliveries: AlertDelivery[];
  acknowledgedBy: ActorRef | null;
  acknowledgedAt: ISODateString | null;
  resolution: IncidentResolution | null;
}
