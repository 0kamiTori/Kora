import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useRealtime } from '../../app/providers/RealtimeProvider';
import { DataTable, type Column } from '../../shared/ui/DataTable';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { formatDateTime } from '../../shared/utils/date.utils';
import { formatDistance } from '../../shared/utils/geo.utils';
import { verificationBadge } from '../drivers/verificationPresentation';
import { useOperationalParameters } from '../governance/useOperationalParameters';
import { ConnectivityIndicator } from './ConnectivityIndicator';
import { positionReceivedAt, type Trip } from './trip.types';
import { formatAnomalyIndex, tripStatusBadge } from './tripPresentation';
import { listTrips } from './trips.api';
import { useConnectivityWatchdog } from './useConnectivityWatchdog';

/** Celda de conectividad: cada viaje tiene su propia vigilancia de señal. */
function TripConnectivityCell({ trip }: { trip: Trip }) {
  const { latestPositions } = useRealtime();
  const { signalLossSeconds } = useOperationalParameters();
  const position = latestPositions[trip.id] ?? trip.lastPosition;
  const state = useConnectivityWatchdog({
    thresholdMs: signalLossSeconds === null ? null : signalLossSeconds * 1000,
    positionId: position?.id ?? null,
    receivedAt: position ? positionReceivedAt(position) : null,
  });

  return (
    <ConnectivityIndicator
      state={state}
      lastDeviceTimestamp={position?.deviceTimestamp ?? null}
      thresholdSeconds={signalLossSeconds}
      compact
    />
  );
}

const tripLink = (trip: Trip) => <Link to={`/trips/${trip.id}`}>{trip.id}</Link>;

const ACTIVE_COLUMNS: Column<Trip>[] = [
  { id: 'id', header: 'Viaje', sortValue: (trip) => trip.id, cell: tripLink },
  {
    id: 'status',
    header: 'Estado',
    cell: (trip) => <StatusBadge {...tripStatusBadge(trip.status)} />,
  },
  {
    id: 'driver',
    header: 'Conductora',
    sortValue: (trip) => trip.driverName,
    cell: (trip) => (
      <>
        <div>{trip.driverName}</div>
        <StatusBadge {...verificationBadge(trip.driverVerification)} />
      </>
    ),
  },
  {
    id: 'journey',
    header: 'Trayecto',
    cell: (trip) => `${trip.origin.label} → ${trip.destination.label}`,
  },
  {
    id: 'connectivity',
    header: 'Conectividad',
    cell: (trip) => <TripConnectivityCell trip={trip} />,
  },
  {
    id: 'deviation',
    header: 'Desviación / parada',
    cell: (trip) => (
      <>
        {trip.activeDeviation && (
          <StatusBadge
            tone="danger"
            label={`Desviación ≈ ${formatDistance(trip.activeDeviation.meters)}`}
          />
        )}
        {trip.activeStop && <StatusBadge tone="warning" label="Parada prolongada" />}
        {!trip.activeDeviation && !trip.activeStop && <span className="muted">Sin novedades</span>}
      </>
    ),
  },
  {
    id: 'anomaly',
    header: 'Índice operativo de anomalía',
    sortValue: (trip) => trip.anomalyIndex ?? -1,
    cell: (trip) => formatAnomalyIndex(trip.anomalyIndex),
  },
];

const RECENT_COLUMNS: Column<Trip>[] = [
  { id: 'id', header: 'Viaje', sortValue: (trip) => trip.id, cell: tripLink },
  {
    id: 'status',
    header: 'Estado',
    cell: (trip) => <StatusBadge {...tripStatusBadge(trip.status)} />,
  },
  { id: 'driver', header: 'Conductora', cell: (trip) => trip.driverName },
  {
    id: 'journey',
    header: 'Trayecto',
    cell: (trip) => `${trip.origin.label} → ${trip.destination.label}`,
  },
  {
    id: 'ended',
    header: 'Finalizó',
    sortValue: (trip) => trip.endedAt ?? '',
    cell: (trip) => formatDateTime(trip.endedAt),
  },
];

/** Monitoreo de viajes en vivo (RF03, RF07, RF11). */
export function ActiveTripsPage() {
  const active = useQuery({
    queryKey: ['trips', 'list', 'active'],
    queryFn: () => listTrips('active'),
    // Respaldo por si el canal en tiempo real se cae: la lista no queda congelada.
    refetchInterval: 30_000,
  });
  const recent = useQuery({
    queryKey: ['trips', 'list', 'recent'],
    queryFn: () => listTrips('recent'),
  });

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Viajes activos</h1>
          <p className="muted">
            Cada viaje muestra la hora de su último dato de posición. Si no llegan posiciones dentro
            del umbral configurado, se marca sin señal.
          </p>
        </div>
      </header>

      <DataTable
        caption="Viajes activos"
        columns={ACTIVE_COLUMNS}
        rows={active.data}
        getRowId={(trip) => trip.id}
        isLoading={active.isLoading}
        error={active.error}
        onRetry={() => void active.refetch()}
        emptyMessage="No hay viajes activos en este momento."
      />

      <h2>Viajes recientes</h2>
      <p className="muted">
        El recorrido de un viaje finalizado es un dato sensible: se consulta desde su detalle, con
        justificación.
      </p>
      <DataTable
        caption="Viajes recientes"
        columns={RECENT_COLUMNS}
        rows={recent.data}
        getRowId={(trip) => trip.id}
        isLoading={recent.isLoading}
        error={recent.error}
        onRetry={() => void recent.refetch()}
        emptyMessage="No hay viajes recientes."
      />
    </section>
  );
}
