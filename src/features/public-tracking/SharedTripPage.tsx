import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ApiError } from '../../shared/api/client';
import { LoadingState } from '../../shared/ui/PageState';
import { formatTime } from '../../shared/utils/date.utils';
import { ConnectivityIndicator } from '../trips/ConnectivityIndicator';
import { DriverMarker } from '../trips/map/DriverMarker';
import { TripMonitorMap } from '../trips/map/TripMonitorMap';
import { isActiveTrip, type TripStatus } from '../trips/trip.types';
import { useConnectivityWatchdog } from '../trips/useConnectivityWatchdog';
import { getSharedTrip, type ShareLinkErrorCode } from './publicTracking.api';

const POLL_INTERVAL_MS = 5_000;

const STATUS_MESSAGES: Readonly<Record<TripStatus, string>> = {
  requested: 'El viaje aún no ha comenzado.',
  accepted: 'El viaje aún no ha comenzado.',
  driver_arriving: 'El viaje aún no ha comenzado.',
  in_progress: 'Viaje en curso.',
  completed: 'El viaje finalizó.',
  cancelled: 'El viaje fue cancelado.',
};

const LINK_ERRORS: Readonly<Record<ShareLinkErrorCode, { title: string; detail: string }>> = {
  link_expired: {
    title: 'Este enlace expiró',
    detail:
      'Los enlaces de seguimiento son temporales. Pide a quien te lo compartió que genere uno nuevo.',
  },
  link_revoked: {
    title: 'Este enlace fue desactivado',
    detail: 'La persona que compartió el viaje dejó de compartirlo.',
  },
  link_not_found: {
    title: 'Enlace no válido',
    detail: 'Revisa que hayas copiado el enlace completo.',
  },
};

function isLinkError(code: string): code is ShareLinkErrorCode {
  return code in LINK_ERRORS;
}

/**
 * Vista pública del Contacto de Confianza (RF10, RNF02).
 * Muestra únicamente: estado del viaje, última posición y la hora de ese dato.
 */
export function SharedTripPage() {
  const { token = '' } = useParams();

  const query = useQuery({
    queryKey: ['public-track', token],
    queryFn: ({ signal }) => getSharedTrip(token, signal),
    // Si el enlace dejó de ser válido no se sigue consultando.
    refetchInterval: (current) => (current.state.status === 'error' ? false : POLL_INTERVAL_MS),
    staleTime: 0,
    gcTime: 0,
  });

  const view = query.data;
  const position = view?.lastPosition ?? null;
  const isActive = view ? isActiveTrip(view.tripStatus) : false;
  const thresholdSeconds = view?.signalLossThresholdSeconds ?? null;

  const connectivity = useConnectivityWatchdog({
    thresholdMs: isActive && thresholdSeconds !== null ? thresholdSeconds * 1000 : null,
    positionId: position?.id ?? null,
    receivedAt: position ? Date.parse(position.serverTimestamp) : null,
  });

  if (query.isError) {
    const error = query.error;
    if (error instanceof ApiError && isLinkError(error.code)) {
      const message = LINK_ERRORS[error.code];
      return (
        <section className="card public__card" role="alert">
          <h1>{message.title}</h1>
          <p>{message.detail}</p>
        </section>
      );
    }
    return (
      <section className="card public__card" role="alert">
        <h1>No se pudo cargar el seguimiento</h1>
        <p>Puede ser un problema de conexión. Inténtalo de nuevo en unos segundos.</p>
        <button type="button" className="btn btn--primary" onClick={() => void query.refetch()}>
          Reintentar
        </button>
      </section>
    );
  }

  if (!view) return <LoadingState label="Cargando seguimiento…" />;

  return (
    <section className="card public__card">
      <h1>Seguimiento del viaje</h1>
      <p className="public__status" role="status">
        {STATUS_MESSAGES[view.tripStatus]}
      </p>

      {isActive ? (
        <>
          <ConnectivityIndicator
            state={connectivity}
            lastDeviceTimestamp={position?.deviceTimestamp ?? null}
            thresholdSeconds={thresholdSeconds}
          />
          <TripMonitorMap ariaLabel="Mapa con la última posición conocida del viaje">
            {position && (
              <DriverMarker
                position={position}
                stale={connectivity.status !== 'online'}
                label={
                  connectivity.status === 'online'
                    ? 'Posición del viaje'
                    : `Última posición conocida (${formatTime(position.deviceTimestamp)})`
                }
              />
            )}
          </TripMonitorMap>
          {!position && <p className="muted">Todavía no hay una posición disponible.</p>}
        </>
      ) : (
        <p className="muted">Ya no se muestra la posición porque el viaje no está en curso.</p>
      )}

      <p className="muted small">
        Este enlace funciona hasta las{' '}
        <time dateTime={view.expiresAt}>{formatTime(view.expiresAt)}</time>.
      </p>
    </section>
  );
}
