import { useNow } from '../../shared/hooks/useNow';
import type { ISODateString } from '../../shared/types/common.types';
import { StatusBadge, type BadgeDescriptor } from '../../shared/ui/StatusBadge';
import { formatElapsed, formatTime } from '../../shared/utils/date.utils';
import type { ConnectivityState, ConnectivityStatus } from './useConnectivityWatchdog';

const BADGES: Readonly<Record<ConnectivityStatus, BadgeDescriptor>> = {
  online: { tone: 'success', label: 'Con señal' },
  lost: { tone: 'danger', label: 'Sin señal' },
  waiting: { tone: 'neutral', label: 'Esperando posición' },
};

interface ConnectivityIndicatorProps {
  state: ConnectivityState;
  /** Instante en que el dispositivo tomó la última posición conocida. */
  lastDeviceTimestamp: ISODateString | null;
  /** Umbral vigente (s); null si los parámetros aún no cargan. */
  thresholdSeconds: number | null;
  compact?: boolean;
}

/**
 * Conectividad del viaje (RF11, RNF04). Siempre muestra la hora del último dato:
 * una posición antigua nunca se presenta como actual.
 */
export function ConnectivityIndicator({
  state,
  lastDeviceTimestamp,
  thresholdSeconds,
  compact = false,
}: ConnectivityIndicatorProps) {
  const now = useNow(1000);
  const badge =
    thresholdSeconds === null
      ? ({ tone: 'neutral', label: 'Umbral no disponible' } satisfies BadgeDescriptor)
      : BADGES[state.status];

  return (
    <div className={`connectivity${compact ? ' connectivity--compact' : ''}`} role="status">
      <StatusBadge {...badge} />
      <span className="connectivity__time">
        {lastDeviceTimestamp ? (
          <>
            Último dato:{' '}
            <time dateTime={lastDeviceTimestamp}>{formatTime(lastDeviceTimestamp)}</time> (
            {formatElapsed(now - Date.parse(lastDeviceTimestamp))})
          </>
        ) : (
          'Sin datos de posición'
        )}
      </span>
      {!compact && state.status === 'lost' && thresholdSeconds !== null && (
        <span className="connectivity__warning">
          Pasaron más de {thresholdSeconds} s sin posiciones. La ubicación mostrada no es actual.
        </span>
      )}
    </div>
  );
}
