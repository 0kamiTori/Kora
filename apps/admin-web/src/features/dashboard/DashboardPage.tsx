import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { errorMessage } from '../../shared/api/client';
import { listDrivers } from '../drivers/drivers.api';
import { listPrivacyRequests } from '../governance/auditPrivacy.api';
import { ALERTS_QUERY_KEY, listAlerts } from '../incidents/alerts.api';
import { listTrips } from '../trips/trips.api';

interface SummaryCardProps<T> {
  title: string;
  to: string;
  linkLabel: string;
  query: UseQueryResult<T[]>;
  count: (items: T[]) => number;
  hint: string;
}

/** Tarjeta de resumen con sus propios estados de carga y error. */
function SummaryCard<T>({ title, to, linkLabel, query, count, hint }: SummaryCardProps<T>) {
  return (
    <article className="card summary">
      <h2>{title}</h2>
      {query.isError ? (
        <p className="notice notice--danger" role="alert">
          {errorMessage(query.error)}
        </p>
      ) : !query.data ? (
        <p className="muted" role="status">
          Cargando…
        </p>
      ) : (
        <p className="summary__value">{count(query.data)}</p>
      )}
      <p className="muted small">{hint}</p>
      <Link to={to}>{linkLabel}</Link>
    </article>
  );
}

/**
 * Panel de inicio. Solo muestra (y solo consulta) lo que el rol puede ver:
 * las consultas sin permiso ni siquiera se envían.
 */
export function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const canTrips = hasPermission('trips:monitor');
  const canAlerts = hasPermission('alerts:view');
  const canDrivers = hasPermission('drivers:view');
  const canPrivacy = hasPermission('privacy:manage');

  const trips = useQuery({
    queryKey: ['trips', 'list', 'active'],
    queryFn: () => listTrips('active'),
    enabled: canTrips,
  });
  const alerts = useQuery({ queryKey: ALERTS_QUERY_KEY, queryFn: listAlerts, enabled: canAlerts });
  const drivers = useQuery({ queryKey: ['drivers'], queryFn: listDrivers, enabled: canDrivers });
  const privacy = useQuery({
    queryKey: ['privacy-requests'],
    queryFn: listPrivacyRequests,
    enabled: canPrivacy,
  });

  const nothingVisible = !canTrips && !canAlerts && !canDrivers && !canPrivacy;

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Panel</h1>
          <p className="muted">Hola, {user?.fullName}. Este es el estado actual del piloto.</p>
        </div>
      </header>

      {nothingVisible ? (
        <p className="muted">Tu rol no tiene indicadores asignados en el panel.</p>
      ) : (
        <div className="grid grid--cards">
          {canTrips && (
            <SummaryCard
              title="Viajes activos"
              to="/trips"
              linkLabel="Ir al monitoreo"
              query={trips}
              count={(items) => items.length}
              hint="Viajes aceptados, en camino o en curso."
            />
          )}
          {canAlerts && (
            <SummaryCard
              title="Alertas sin atender"
              to="/incidents"
              linkLabel="Ver alertas"
              query={alerts}
              count={(items) => items.filter((alert) => alert.status === 'open').length}
              hint="Permanecen visibles hasta registrar la atención."
            />
          )}
          {canDrivers && (
            <SummaryCard
              title="Solicitudes por revisar"
              to="/drivers"
              linkLabel="Ver conductoras"
              query={drivers}
              count={(items) => items.filter((driver) => driver.status === 'pending_review').length}
              hint="Conductoras pendientes de aprobación o rechazo."
            />
          )}
          {canDrivers && (
            <SummaryCard
              title="Identidad sin confirmar"
              to="/drivers"
              linkLabel="Ver conductoras"
              query={drivers}
              count={(items) =>
                items.filter(
                  (driver) =>
                    driver.status === 'approved' && driver.identityVerification !== 'confirmed',
                ).length
              }
              hint="Conductoras aprobadas con verificación pendiente, vencida o fallida."
            />
          )}
          {canPrivacy && (
            <SummaryCard
              title="Solicitudes de datos abiertas"
              to="/governance/privacy"
              linkLabel="Ver solicitudes"
              query={privacy}
              count={(items) =>
                items.filter(
                  (request) => request.status === 'received' || request.status === 'in_review',
                ).length
              }
              hint="Consulta, retiro o eliminación en trámite."
            />
          )}
        </div>
      )}
    </section>
  );
}
