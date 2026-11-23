import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { errorMessage } from '../../shared/api/client';
import { appConfig } from '../../shared/api/config';
import { DataTable, type Column } from '../../shared/ui/DataTable';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { formatDateTime } from '../../shared/utils/date.utils';
import type { Alert, AlertStatus } from './alert.types';
import {
  ALERT_TYPE_LABELS,
  CHANNEL_LABELS,
  OUTCOME_LABELS,
  alertStatusBadge,
  deliveryBadge,
  severityBadge,
  sortAlerts,
} from './alertPresentation';
import { ALERTS_QUERY_KEY, acknowledgeAlert, listAlerts } from './alerts.api';
import { AnomalyFactorsCard } from './AnomalyFactorsCard';
import { IncidentResolutionForm } from './IncidentResolutionForm';

type Filter = AlertStatus | 'all';

const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'open', label: 'Sin atender' },
  { value: 'acknowledged', label: 'En atención' },
  { value: 'resolved', label: 'Resueltas' },
];

function AlertDetail({ alert }: { alert: Alert }) {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canAttend = hasPermission('alerts:attend');

  const acknowledge = useMutation({
    mutationFn: () => acknowledgeAlert(alert.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY }),
  });

  return (
    <section className="stack" aria-label={`Detalle de la alerta ${alert.id}`}>
      <article className="card">
        <h2>
          {ALERT_TYPE_LABELS[alert.type]} · {alert.id}
        </h2>
        <p>
          <StatusBadge {...severityBadge(alert.severity)} />{' '}
          <StatusBadge {...alertStatusBadge(alert.status)} />{' '}
          {alert.silent && <StatusBadge tone="neutral" label="Silenciosa" />}
        </p>
        <p>{alert.summary}</p>
        <dl className="kv">
          <div>
            <dt>Viaje</dt>
            <dd>
              {hasPermission('trips:monitor') ? (
                <Link to={`/trips/${alert.tripId}`}>{alert.tripId}</Link>
              ) : (
                alert.tripId
              )}
            </dd>
          </div>
          <div>
            <dt>Creada</dt>
            <dd>{formatDateTime(alert.createdAt)}</dd>
          </div>
          <div>
            <dt>Atención</dt>
            <dd>
              {alert.acknowledgedBy
                ? `${alert.acknowledgedBy.name}, ${formatDateTime(alert.acknowledgedAt)}`
                : 'Nadie ha registrado atención'}
            </dd>
          </div>
          {alert.resolution && (
            <>
              <div>
                <dt>Resultado</dt>
                <dd>{OUTCOME_LABELS[alert.resolution.outcome]}</dd>
              </div>
              <div>
                <dt>Resuelta por</dt>
                <dd>
                  {alert.resolution.resolvedBy.name}, {formatDateTime(alert.resolution.resolvedAt)}
                </dd>
              </div>
              <div>
                <dt>Notas</dt>
                <dd>{alert.resolution.notes}</dd>
              </div>
            </>
          )}
        </dl>

        {acknowledge.isError && (
          <p className="notice notice--danger" role="alert">
            {errorMessage(acknowledge.error)}
          </p>
        )}
        <div className="actions">
          {canAttend && alert.status === 'open' && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => acknowledge.mutate()}
              disabled={acknowledge.isPending}
            >
              {acknowledge.isPending ? 'Registrando…' : 'Registrar atención'}
            </button>
          )}
          {appConfig.helpChannelUrl ? (
            <a
              className="btn"
              href={appConfig.helpChannelUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              Contactar ayuda
            </a>
          ) : (
            <span className="muted small">Canal de ayuda no configurado.</span>
          )}
        </div>
        <p className="muted small">
          «Contactar ayuda» abre el canal configurado por la administración. No envía ni solicita
          asistencia de forma automática: la gestión la hace la persona que atiende.
        </p>
      </article>

      <article className="card">
        <h3>Notificaciones de esta alerta</h3>
        {alert.deliveries.length === 0 ? (
          <p className="muted">No hay notificaciones registradas.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Estado de entrega de las notificaciones</caption>
              <thead>
                <tr>
                  <th scope="col">Canal</th>
                  <th scope="col">Destino</th>
                  <th scope="col">Intentos</th>
                  <th scope="col">Último intento</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Confirmación</th>
                </tr>
              </thead>
              <tbody>
                {alert.deliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td data-label="Canal">{CHANNEL_LABELS[delivery.channel]}</td>
                    <td data-label="Destino">{delivery.destination}</td>
                    <td data-label="Intentos">{delivery.attempts}</td>
                    <td data-label="Último intento">{formatDateTime(delivery.lastAttemptAt)}</td>
                    <td data-label="Estado">
                      <StatusBadge {...deliveryBadge(delivery)} />
                    </td>
                    <td data-label="Confirmación">
                      {delivery.confirmedAt
                        ? formatDateTime(delivery.confirmedAt)
                        : 'Sin confirmación'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <AnomalyFactorsCard assessment={alert.anomaly} />

      {alert.status !== 'resolved' &&
        (canAttend ? (
          <IncidentResolutionForm key={alert.id} alert={alert} />
        ) : (
          <p className="muted">Tu rol no puede registrar la atención ni resolver incidencias.</p>
        ))}
    </section>
  );
}

/** Alertas e incidencias con su trazabilidad (RF08, RF09, RF12). */
export function IncidentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>('all');
  const selectedId = searchParams.get('alert');

  const query = useQuery({ queryKey: ALERTS_QUERY_KEY, queryFn: listAlerts });

  const rows = useMemo(() => {
    if (!query.data) return undefined;
    return sortAlerts(query.data.filter((alert) => filter === 'all' || alert.status === filter));
  }, [query.data, filter]);

  const selected = query.data?.find((alert) => alert.id === selectedId) ?? null;

  const columns: Column<Alert>[] = [
    {
      id: 'type',
      header: 'Alerta',
      cell: (alert) => (
        <button
          type="button"
          className="link-button"
          onClick={() => setSearchParams({ alert: alert.id })}
          aria-current={alert.id === selectedId ? 'true' : undefined}
        >
          {ALERT_TYPE_LABELS[alert.type]} ({alert.id})
        </button>
      ),
    },
    {
      id: 'severity',
      header: 'Severidad',
      cell: (alert) => <StatusBadge {...severityBadge(alert.severity)} />,
    },
    {
      id: 'status',
      header: 'Estado',
      cell: (alert) => <StatusBadge {...alertStatusBadge(alert.status)} />,
    },
    {
      id: 'trip',
      header: 'Viaje',
      sortValue: (alert) => alert.tripId,
      cell: (alert) => alert.tripId,
    },
    {
      id: 'created',
      header: 'Creada',
      sortValue: (alert) => alert.createdAt,
      cell: (alert) => formatDateTime(alert.createdAt),
    },
    {
      id: 'attended',
      header: 'Atiende',
      cell: (alert) => alert.acknowledgedBy?.name ?? <span className="muted">Nadie aún</span>,
    },
  ];

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Alertas e incidencias</h1>
          <p className="muted">
            Las alertas sin atender permanecen visibles hasta que alguien registra la atención.
          </p>
        </div>
      </header>

      <div className="toolbar" role="group" aria-label="Filtrar por estado">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`btn btn--small${filter === option.value ? ' btn--primary' : ''}`}
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <DataTable
        caption="Alertas e incidencias"
        columns={columns}
        rows={rows}
        getRowId={(alert) => alert.id}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyMessage="No hay alertas con este filtro."
        selectedRowId={selectedId}
      />

      {selected ? (
        <AlertDetail key={selected.id} alert={selected} />
      ) : (
        query.data &&
        query.data.length > 0 && (
          <p className="muted">Selecciona una alerta de la tabla para ver su detalle.</p>
        )
      )}
    </section>
  );
}
