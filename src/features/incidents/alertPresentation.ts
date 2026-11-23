import type { BadgeDescriptor } from '../../shared/ui/StatusBadge';
import type {
  Alert,
  AlertDelivery,
  AlertSeverity,
  AlertStatus,
  AlertType,
  DeliveryChannel,
  ResolutionOutcome,
} from './alert.types';

export const ALERT_TYPE_LABELS: Readonly<Record<AlertType, string>> = {
  silent_alert: 'Alerta silenciosa de la pasajera',
  help_button: 'Botón de ayuda',
  route_deviation: 'Desviación de ruta',
  prolonged_stop: 'Parada prolongada',
  signal_loss: 'Pérdida de señal',
  verification_failed: 'Verificación de conductora fallida',
  anomaly_index: 'Índice operativo de anomalía elevado',
};

const SEVERITY: Readonly<Record<AlertSeverity, BadgeDescriptor>> = {
  critical: { tone: 'danger', label: 'Crítica' },
  high: { tone: 'warning', label: 'Alta' },
  medium: { tone: 'info', label: 'Media' },
};

export function severityBadge(severity: AlertSeverity): BadgeDescriptor {
  return SEVERITY[severity];
}

const SEVERITY_ORDER: Readonly<Record<AlertSeverity, number>> = { critical: 0, high: 1, medium: 2 };

/** Críticas primero; dentro de la misma severidad, la más reciente primero. */
export function sortAlerts(alerts: readonly Alert[]): Alert[] {
  return [...alerts].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

const STATUS: Readonly<Record<AlertStatus, BadgeDescriptor>> = {
  open: { tone: 'danger', label: 'Sin atender' },
  acknowledged: { tone: 'warning', label: 'En atención' },
  resolved: { tone: 'success', label: 'Resuelta' },
};

export function alertStatusBadge(status: AlertStatus): BadgeDescriptor {
  return STATUS[status];
}

export const CHANNEL_LABELS: Readonly<Record<DeliveryChannel, string>> = {
  push: 'Notificación push',
  sms: 'SMS',
  admin_portal: 'Portal de administración',
};

/**
 * Regla de negocio (RNF03): una notificación solo se muestra como entregada si el
 * backend informó la confirmación (`confirmedAt`). "Enviada" no es "entregada".
 */
export function deliveryBadge(delivery: AlertDelivery): BadgeDescriptor {
  if (delivery.status === 'delivered' && delivery.confirmedAt) {
    return { tone: 'success', label: 'Entrega confirmada' };
  }
  if (delivery.status === 'failed') return { tone: 'danger', label: 'Entrega fallida' };
  if (delivery.status === 'pending') return { tone: 'neutral', label: 'Pendiente de envío' };
  return { tone: 'warning', label: 'Enviada, sin confirmación de entrega' };
}

export const OUTCOME_LABELS: Readonly<Record<ResolutionOutcome, string>> = {
  false_alarm: 'Falsa alarma confirmada',
  contact_established: 'Contacto establecido, sin novedad',
  help_channel_used: 'Se usó el canal de ayuda configurado',
  other: 'Otro resultado',
};
