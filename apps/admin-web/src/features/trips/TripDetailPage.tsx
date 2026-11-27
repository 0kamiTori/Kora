import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { useRealtime } from '../../app/providers/RealtimeProvider';
import { AccessJustificationModal } from '../../shared/security/AccessJustificationModal';
import { useJustifiedAccess } from '../../shared/security/useJustifiedAccess';
import { DataTable, type Column } from '../../shared/ui/DataTable';
import { ErrorState, LoadingState } from '../../shared/ui/PageState';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { diffMs, formatDateTime, formatLatency, formatTime } from '../../shared/utils/date.utils';
import { formatCoordinates, formatDistance } from '../../shared/utils/geo.utils';
import { verificationBadge } from '../drivers/verificationPresentation';
import { useOperationalParameters } from '../governance/useOperationalParameters';
import { ConnectivityIndicator } from './ConnectivityIndicator';
import { DeviationOverlay } from './map/DeviationOverlay';
import { DriverMarker } from './map/DriverMarker';
import { TripMonitorMap } from './map/TripMonitorMap';
import {
  TRIP_STATUS_LABELS,
  TRIP_TRANSITIONS,
  isActiveTrip,
  positionReceivedAt,
  type Position,
  type ReceivedPosition,
} from './trip.types';
import { formatAnomalyIndex, tripStatusBadge } from './tripPresentation';
import { getTrip, requestPositionHistory } from './trips.api';
import { useConnectivityWatchdog } from './useConnectivityWatchdog';

const TRAIL_LIMIT = 300;

const HISTORY_COLUMNS: Column<Position>[] = [
  {
    id: 'device',
    header: 'Hora del dispositivo',
    sortValue: (position) => position.deviceTimestamp,
    cell: (position) => formatDateTime(position.deviceTimestamp),
  },
  {
    id: 'server',
    header: 'Hora del servidor',
    cell: (position) => formatTime(position.serverTimestamp),
  },
  { id: 'coordinates', header: 'Coordenadas', cell: (position) => formatCoordinates(position) },
  { id: 'accuracy', header: 'Precisión', cell: (position) => `± ${position.accuracyMeters} m` },
];

/** Detalle y monitoreo de un viaje (RF03, RF06, RF07, RF11, RNF03). */
export function TripDetailPage() {
  const { tripId = '' } = useParams();
  const { hasPermission } = useAuth();
  const { latestPositions } = useRealtime();
  const parameters = useOperationalParameters();
  const [liveTrail, setLiveTrail] = useState<ReceivedPosition[]>([]);

  const query = useQuery({ queryKey: ['trips', tripId], queryFn: () => getTrip(tripId) });

  const fetchHistory = useCallback(
    (justification: string) => requestPositionHistory(tripId, justification),
    [tripId],
  );
  const history = useJustifiedAccess(fetchHistory);

  const trip = query.data;
  const isActive = trip ? isActiveTrip(trip.status) : false;
  const live = latestPositions[tripId];

  // Recorrido en vivo: solo las posiciones recibidas mientras esta pantalla está abierta.
  useEffect(() => setLiveTrail([]), [tripId]);
  useEffect(() => {
    if (!live) return;
    setLiveTrail((current) =>
      current.some((position) => position.id === live.id)
        ? current
        : [...current, live].slice(-TRAIL_LIMIT),
    );
  }, [live]);

  // La posición actual solo se muestra en viajes activos. En un viaje finalizado es
  // una coordenada histórica y exige justificación.
  const current: Position | ReceivedPosition | null = isActive
    ? (live ?? trip?.lastPosition ?? null)
    : null;

  const connectivity = useConnectivityWatchdog({
    thresholdMs:
      isActive && parameters.signalLossSeconds !== null
        ? parameters.signalLossSeconds * 1000
        : null,
    positionId: current?.id ?? null,
    receivedAt: current ? positionReceivedAt(current) : null,
  });

  const trail = useMemo(() => history.data ?? liveTrail, [history.data, liveTrail]);

  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (!trip) return <LoadingState label="Cargando viaje…" />;

  const nextStates = TRIP_TRANSITIONS[trip.status];
  const deviceToServer = current ? diffMs(current.deviceTimestamp, current.serverTimestamp) : null;
  const serverToClient =
    current && 'clientReceivedAt' in current
      ? diffMs(current.serverTimestamp, current.clientReceivedAt)
      : null;
  const endToEnd =
    current && 'clientReceivedAt' in current
      ? diffMs(current.deviceTimestamp, current.clientReceivedAt)
      : null;

  return (
    <section>
      <p>
        <Link to="/trips">← Viajes</Link>
      </p>
      <header className="page-header">
        <div>
          <h1>Viaje {trip.id}</h1>
          <p>
            <StatusBadge {...tripStatusBadge(trip.status)} />{' '}
            {trip.activeDeviation && (
              <StatusBadge
                tone="danger"
                label={`Desviación ≈ ${formatDistance(trip.activeDeviation.meters)}`}
              />
            )}{' '}
            {trip.activeStop && <StatusBadge tone="warning" label="Parada prolongada" />}
          </p>
        </div>
      </header>

      <div className="grid grid--map">
        <article className="card">
          <h2>Mapa</h2>
          {isActive ? (
            <ConnectivityIndicator
              state={connectivity}
              lastDeviceTimestamp={current?.deviceTimestamp ?? null}
              thresholdSeconds={parameters.signalLossSeconds}
            />
          ) : (
            <p className="notice notice--info">
              Viaje {TRIP_STATUS_LABELS[trip.status].toLowerCase()}: no hay seguimiento en vivo ni
              posición actual.
            </p>
          )}
          <TripMonitorMap
            ariaLabel={`Mapa del viaje ${trip.id}, de ${trip.origin.label} a ${trip.destination.label}`}
            route={trip.route.points}
            trail={trail}
            origin={trip.origin}
            destination={trip.destination}
          >
            {current && (
              <DriverMarker
                position={current}
                stale={connectivity.status !== 'online'}
                label={
                  connectivity.status === 'online'
                    ? 'Vehículo'
                    : `Última posición conocida (${formatTime(current.deviceTimestamp)})`
                }
              />
            )}
            {current && trip.activeDeviation && (
              <DeviationOverlay
                position={current}
                route={trip.route.points}
                meters={trip.activeDeviation.meters}
              />
            )}
          </TripMonitorMap>
          {current && (
            <p className="small">
              Posición: {formatCoordinates(current)} · precisión ± {current.accuracyMeters} m · dato
              de las{' '}
              <time dateTime={current.deviceTimestamp}>{formatTime(current.deviceTimestamp)}</time>
            </p>
          )}
        </article>

        <div className="stack">
          <article className="card">
            <h2>Datos del viaje</h2>
            <dl className="kv">
              <div>
                <dt>Pasajera</dt>
                <dd>{trip.passengerAlias}</dd>
              </div>
              <div>
                <dt>Conductora</dt>
                <dd>
                  <Link to={`/drivers/${trip.driverId}`}>{trip.driverName}</Link>{' '}
                  <StatusBadge {...verificationBadge(trip.driverVerification)} />
                </dd>
              </div>
              <div>
                <dt>Trayecto</dt>
                <dd>
                  {trip.origin.label} → {trip.destination.label}
                </dd>
              </div>
              <div>
                <dt>Inicio</dt>
                <dd>{formatDateTime(trip.startedAt)}</dd>
              </div>
              <div>
                <dt>Fin</dt>
                <dd>{formatDateTime(trip.endedAt)}</dd>
              </div>
              <div>
                <dt>Índice operativo de anomalía</dt>
                <dd>
                  {formatAnomalyIndex(trip.anomalyIndex)}{' '}
                  {hasPermission('alerts:view') && (
                    <Link to="/incidents">Ver factores en alertas</Link>
                  )}
                </dd>
              </div>
              <div>
                <dt>Enlace de seguimiento</dt>
                <dd>{trip.shareLinkActive ? 'Activo' : 'Sin enlace activo'}</dd>
              </div>
            </dl>
          </article>

          <article className="card">
            <h2>Ruta de referencia</h2>
            <dl className="kv">
              <div>
                <dt>Versión</dt>
                <dd>{trip.route.version}</dd>
              </div>
              <div>
                <dt>Distancia</dt>
                <dd>{formatDistance(trip.route.distanceMeters)}</dd>
              </div>
              <div>
                <dt>Umbral de desviación vigente</dt>
                <dd>
                  {parameters.routeDeviationMeters === null
                    ? 'No disponible'
                    : `${parameters.routeDeviationMeters} m`}
                </dd>
              </div>
              <div>
                <dt>Umbral de parada vigente</dt>
                <dd>
                  {parameters.prolongedStopSeconds === null
                    ? 'No disponible'
                    : `${parameters.prolongedStopSeconds} s`}
                </dd>
              </div>
            </dl>
            <h3>Cambios de ruta autorizados</h3>
            {trip.route.authorizedChanges.length === 0 ? (
              <p className="muted">Sin cambios autorizados.</p>
            ) : (
              <ul className="plain-list">
                {trip.route.authorizedChanges.map((change) => (
                  <li key={change.id}>
                    {formatDateTime(change.authorizedAt)} ·{' '}
                    {change.authorizedBy === 'passenger' ? 'Pasajera' : 'Administración'} ·{' '}
                    {change.reason}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </div>

      <div className="grid grid--2">
        <article className="card">
          <h2>Estados del viaje</h2>
          <ol className="timeline">
            {trip.statusHistory.map((change) => (
              <li key={change.id}>
                <strong>{TRIP_STATUS_LABELS[change.to]}</strong>
                <span className="muted small">
                  {' '}
                  · {formatDateTime(change.at)} · {change.actor}
                </span>
              </li>
            ))}
          </ol>
          <p className="small">
            Transiciones válidas desde este estado:{' '}
            {nextStates.length === 0
              ? 'ninguna (estado final).'
              : nextStates.map((status) => TRIP_STATUS_LABELS[status]).join(', ') + '.'}
          </p>
        </article>

        <article className="card">
          <h2>Diagnóstico de latencia</h2>
          {current ? (
            <>
              <dl className="kv">
                <div>
                  <dt>Dispositivo → servidor</dt>
                  <dd>{formatLatency(deviceToServer)}</dd>
                </div>
                <div>
                  <dt>Servidor → este navegador</dt>
                  <dd>
                    {serverToClient === null
                      ? 'No medible (dato cargado por consulta, no en vivo)'
                      : formatLatency(serverToClient)}
                  </dd>
                </div>
                <div>
                  <dt>Extremo a extremo</dt>
                  <dd>{endToEnd === null ? 'No medible' : formatLatency(endToEnd)}</dd>
                </div>
                <div>
                  <dt>Identificador de la posición</dt>
                  <dd>{current.id}</dd>
                </div>
              </dl>
              <p className="muted small">
                Valores aproximados: dependen de que los relojes del dispositivo, el servidor y este
                navegador estén sincronizados.
              </p>
            </>
          ) : (
            <p className="muted">Sin posición actual para medir.</p>
          )}
        </article>
      </div>

      <article className="card">
        <h2>Recorrido histórico</h2>
        <p className="muted">
          Las coordenadas históricas son un dato sensible: la consulta exige justificación y queda
          en auditoría.
        </p>
        {!hasPermission('trips:history') ? (
          <p className="muted">Tu rol no puede consultar el recorrido histórico.</p>
        ) : history.status === 'granted' && history.data ? (
          <>
            <div className="actions">
              <button type="button" className="btn btn--small" onClick={history.hide}>
                Ocultar recorrido
              </button>
            </div>
            <DataTable
              caption="Posiciones históricas del viaje"
              columns={HISTORY_COLUMNS}
              rows={history.data}
              getRowId={(position) => position.id}
              emptyMessage="El viaje no tiene posiciones registradas."
            />
          </>
        ) : (
          <button type="button" className="btn" onClick={history.requestAccess}>
            Solicitar acceso al recorrido histórico
          </button>
        )}
      </article>

      <AccessJustificationModal
        open={history.isPrompting}
        resourceLabel={`el recorrido histórico del viaje ${trip.id}`}
        isSubmitting={history.status === 'loading'}
        error={history.status === 'error' ? history.error : null}
        onConfirm={(justification) => void history.confirm(justification)}
        onCancel={history.cancel}
      />
    </section>
  );
}
