import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { errorMessage } from '../../shared/api/client';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { formatTime } from '../../shared/utils/date.utils';
import { ALERT_TYPE_LABELS, severityBadge, sortAlerts } from './alertPresentation';
import { ALERTS_QUERY_KEY, acknowledgeAlert, listAlerts } from './alerts.api';
import { useAlertSound } from './useAlertSound';

const VISIBLE_LIMIT = 3;

/**
 * Banner de alertas en vivo (RF09, RF12).
 *
 * Una alerta permanece aquí hasta que una persona administradora registra la atención.
 * No se puede cerrar ni descartar de otra forma, y el estado sale siempre del backend:
 * recargar la página o cambiar de sección no la oculta.
 */
export function LiveAlertBanner() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canView = hasPermission('alerts:view');
  const canAttend = hasPermission('alerts:attend');

  const query = useQuery({
    queryKey: ALERTS_QUERY_KEY,
    queryFn: listAlerts,
    enabled: canView,
    // Respaldo si el canal en tiempo real se cae: las alertas siguen llegando.
    refetchInterval: 20_000,
  });

  const openAlerts = useMemo(
    () => sortAlerts((query.data ?? []).filter((alert) => alert.status === 'open')),
    [query.data],
  );
  const criticalIds = useMemo(
    () => openAlerts.filter((alert) => alert.severity === 'critical').map((alert) => alert.id),
    [openAlerts],
  );
  const sound = useAlertSound(criticalIds);

  const acknowledge = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY }),
  });

  if (!canView) return null;

  const hasCritical = criticalIds.length > 0;
  const hidden = openAlerts.length - VISIBLE_LIMIT;

  return (
    <section
      className={`alert-banner${openAlerts.length > 0 ? ' alert-banner--active' : ''}${hasCritical ? ' alert-banner--critical' : ''}`}
      aria-label="Alertas en vivo"
    >
      <div className="alert-banner__bar">
        <p className="alert-banner__summary">
          {openAlerts.length === 0
            ? 'Sin alertas pendientes de atención.'
            : `${openAlerts.length} ${openAlerts.length === 1 ? 'alerta pendiente' : 'alertas pendientes'} de atención.`}
        </p>
        <div className="alert-banner__sound">
          {sound.state === 'enabled' ? (
            <button type="button" className="btn btn--small" onClick={sound.disable}>
              🔊 Sonido activado · Silenciar
            </button>
          ) : (
            <button type="button" className="btn btn--small" onClick={() => void sound.enable()}>
              🔇 Activar sonido de alertas críticas
            </button>
          )}
          {sound.state === 'blocked' && (
            <span className="alert-banner__hint" role="status">
              El navegador bloqueó el sonido. Pulsa de nuevo o revisa los permisos del sitio.
            </span>
          )}
        </div>
      </div>

      {query.isError && (
        <p className="notice notice--warning" role="alert">
          No se pudo actualizar el estado de las alertas ({errorMessage(query.error)}). La lista
          puede estar incompleta.
        </p>
      )}
      {acknowledge.isError && (
        <p className="notice notice--danger" role="alert">
          No se registró la atención: {errorMessage(acknowledge.error)} La alerta sigue pendiente.
        </p>
      )}

      {/* aria-live anuncia las alertas nuevas a los lectores de pantalla. */}
      <ul className="alert-banner__list" aria-live="assertive" aria-relevant="additions">
        {openAlerts.slice(0, VISIBLE_LIMIT).map((alert) => (
          <li key={alert.id} className={`alert-item alert-item--${alert.severity}`}>
            <div className="alert-item__body">
              <StatusBadge {...severityBadge(alert.severity)} />
              <strong>{ALERT_TYPE_LABELS[alert.type]}</strong>
              <span>
                Viaje{' '}
                {hasPermission('trips:monitor') ? (
                  <Link to={`/trips/${alert.tripId}`}>{alert.tripId}</Link>
                ) : (
                  alert.tripId
                )}{' '}
                · <time dateTime={alert.createdAt}>{formatTime(alert.createdAt)}</time>
              </span>
              <span className="alert-item__summary">{alert.summary}</span>
            </div>
            <div className="actions">
              <Link
                className="btn btn--small"
                to={`/incidents?alert=${encodeURIComponent(alert.id)}`}
              >
                Ver detalle
              </Link>
              {canAttend && (
                <button
                  type="button"
                  className="btn btn--small btn--primary"
                  onClick={() => acknowledge.mutate(alert.id)}
                  disabled={acknowledge.isPending}
                  aria-label={`Registrar atención de la alerta ${alert.id}`}
                >
                  Registrar atención
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <p className="alert-banner__more">
          Hay {hidden} {hidden === 1 ? 'alerta pendiente más' : 'alertas pendientes más'}.{' '}
          <Link to="/incidents">Ver todas</Link>
        </p>
      )}
    </section>
  );
}
