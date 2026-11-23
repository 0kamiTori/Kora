import type { BadgeDescriptor } from '../../shared/ui/StatusBadge';
import { TRIP_STATUS_LABELS, type TripStatus } from './trip.types';

const TONES: Readonly<Record<TripStatus, BadgeDescriptor['tone']>> = {
  requested: 'neutral',
  accepted: 'info',
  driver_arriving: 'info',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'neutral',
};

export function tripStatusBadge(status: TripStatus): BadgeDescriptor {
  return { tone: TONES[status], label: TRIP_STATUS_LABELS[status] };
}

/** El índice se muestra como número sobre 100, sin lenguaje de probabilidad ni de riesgo delictivo. */
export function formatAnomalyIndex(index: number | null): string {
  return index === null ? 'Sin calcular' : `${index} / 100`;
}
