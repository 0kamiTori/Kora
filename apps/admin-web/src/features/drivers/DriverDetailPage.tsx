import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { AccessJustificationModal } from '../../shared/security/AccessJustificationModal';
import { useJustifiedAccess } from '../../shared/security/useJustifiedAccess';
import { DataTable, type Column } from '../../shared/ui/DataTable';
import { ErrorState, LoadingState } from '../../shared/ui/PageState';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { formatDate, formatDateTime } from '../../shared/utils/date.utils';
import type { SensitiveAssetKind, Verification } from './driver.types';
import { DriverReviewDrawer } from './DriverReviewDrawer';
import { getDriver, requestSensitiveAsset } from './drivers.api';
import {
  LIVENESS_LABELS,
  RESULT_LABELS,
  VERIFICATION_KIND_LABELS,
  documentBadge,
  driverStatusBadge,
  verificationBadge,
} from './verificationPresentation';

const ASSET_LABELS: Readonly<Record<SensitiveAssetKind, string>> = {
  photo: 'Fotografía de referencia',
  template: 'Plantilla biométrica',
};

interface SensitiveAssetSectionProps {
  driverId: string;
  kind: SensitiveAssetKind;
  available: boolean;
}

/** Dato sensible: solo se pide al backend tras registrar una justificación (RNF02). */
function SensitiveAssetSection({ driverId, kind, available }: SensitiveAssetSectionProps) {
  const { hasPermission } = useAuth();
  const fetcher = useCallback(
    (justification: string) => requestSensitiveAsset(driverId, kind, justification),
    [driverId, kind],
  );
  const access = useJustifiedAccess(fetcher);
  const label = ASSET_LABELS[kind];

  return (
    <div className="sensitive">
      <h3>{label}</h3>
      {!available ? (
        <p className="muted">No hay {label.toLowerCase()} registrada.</p>
      ) : !hasPermission('drivers:sensitive') ? (
        <p className="muted">Tu rol no puede consultar este dato sensible.</p>
      ) : access.status === 'granted' && access.data ? (
        <>
          <div className="sensitive__content" data-testid={`sensitive-${kind}`}>
            {access.data.contentUrl ? (
              <img src={access.data.contentUrl} alt={label} />
            ) : (
              <p>{access.data.description}</p>
            )}
          </div>
          <p className="muted small">
            Consulta registrada en auditoría ({access.data.auditEntryId}). Acceso válido hasta{' '}
            {formatDateTime(access.data.expiresAt)}.
          </p>
          <button type="button" className="btn btn--small" onClick={access.hide}>
            Ocultar
          </button>
        </>
      ) : (
        <>
          <p className="muted">Oculto. Para verlo debes justificar el acceso.</p>
          <button type="button" className="btn btn--small" onClick={access.requestAccess}>
            Solicitar acceso a {label.toLowerCase()}
          </button>
        </>
      )}
      <AccessJustificationModal
        open={access.isPrompting}
        resourceLabel={`${label.toLowerCase()} de la conductora ${driverId}`}
        isSubmitting={access.status === 'loading'}
        error={access.status === 'error' ? access.error : null}
        onConfirm={(justification) => void access.confirm(justification)}
        onCancel={access.cancel}
      />
    </div>
  );
}

const VERIFICATION_COLUMNS: Column<Verification>[] = [
  { id: 'kind', header: 'Tipo', cell: (item) => VERIFICATION_KIND_LABELS[item.kind] },
  {
    id: 'status',
    header: 'Estado',
    cell: (item) => <StatusBadge {...verificationBadge(item.status)} />,
  },
  {
    id: 'result',
    header: 'Comparación 1:1',
    cell: (item) => (item.result ? RESULT_LABELS[item.result] : 'Sin resultado'),
  },
  {
    id: 'score',
    header: 'Puntuación / umbral',
    cell: (item) =>
      `${item.score === null ? '—' : item.score.toFixed(2)} / ${item.threshold.toFixed(2)}`,
  },
  {
    id: 'liveness',
    header: 'Prueba de vida',
    cell: (item) => LIVENESS_LABELS[item.livenessStatus],
  },
  { id: 'model', header: 'Modelo', cell: (item) => item.modelVersion },
  {
    id: 'requested',
    header: 'Solicitada',
    sortValue: (item) => item.requestedAt,
    cell: (item) => formatDateTime(item.requestedAt),
  },
  {
    id: 'due',
    header: 'Fecha límite',
    cell: (item) => (item.dueAt ? formatDateTime(item.dueAt) : '—'),
  },
];

/** Ficha de la conductora: solicitud, verificaciones y datos sensibles bajo justificación. */
export function DriverDetailPage() {
  const { driverId = '' } = useParams();
  const { hasPermission } = useAuth();
  const [isReviewing, setReviewing] = useState(false);

  const query = useQuery({
    queryKey: ['drivers', driverId],
    queryFn: () => getDriver(driverId),
  });

  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data) return <LoadingState label="Cargando conductora…" />;

  const driver = query.data;
  const canReview = hasPermission('drivers:review') && driver.status === 'pending_review';

  return (
    <section>
      <p>
        <Link to="/drivers">← Conductoras</Link>
      </p>
      <header className="page-header">
        <div>
          <h1>{driver.fullName}</h1>
          <p>
            <StatusBadge {...driverStatusBadge(driver.status)} />{' '}
            <StatusBadge {...verificationBadge(driver.identityVerification)} />
          </p>
        </div>
        {canReview && (
          <button type="button" className="btn btn--primary" onClick={() => setReviewing(true)}>
            Revisar solicitud
          </button>
        )}
      </header>

      {driver.identityVerification !== 'confirmed' && (
        <p className="notice notice--warning" role="status">
          La identidad de esta conductora <strong>no está confirmada</strong> en este momento.
        </p>
      )}

      <div className="grid grid--2">
        <article className="card">
          <h2>Datos de la solicitud</h2>
          <dl className="kv">
            <div>
              <dt>Identificador</dt>
              <dd>{driver.id}</dd>
            </div>
            <div>
              <dt>Documento</dt>
              <dd>{driver.documentNumberMasked}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{driver.phoneMasked}</dd>
            </div>
            <div>
              <dt>Vehículo</dt>
              <dd>
                {driver.vehicle.plate} · {driver.vehicle.model} · {driver.vehicle.color}
              </dd>
            </div>
            <div>
              <dt>Registro</dt>
              <dd>{formatDate(driver.registeredAt)}</dd>
            </div>
            <div>
              <dt>Revisión</dt>
              <dd>
                {driver.reviewedBy
                  ? `${driver.reviewedBy.name}, ${formatDateTime(driver.reviewedAt)}`
                  : 'Sin revisar'}
              </dd>
            </div>
            {driver.rejectionReason && (
              <div>
                <dt>Motivo del rechazo</dt>
                <dd>{driver.rejectionReason}</dd>
              </div>
            )}
          </dl>
        </article>

        <article className="card">
          <h2>Consentimiento y documentos</h2>
          <dl className="kv">
            <div>
              <dt>Política aceptada</dt>
              <dd>
                {driver.consent.policyVersion} · {formatDate(driver.consent.acceptedAt)}
              </dd>
            </div>
            <div>
              <dt>Consentimiento</dt>
              <dd>
                {driver.consent.withdrawnAt
                  ? `Retirado el ${formatDate(driver.consent.withdrawnAt)}`
                  : 'Vigente'}
              </dd>
            </div>
          </dl>
          <ul className="plain-list">
            {driver.documents.map((document) => (
              <li key={document.id}>
                {document.label} <StatusBadge {...documentBadge(document.status)} />
                {document.expiresAt && (
                  <span className="muted small"> · vence {formatDate(document.expiresAt)}</span>
                )}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article className="card">
        <h2>Verificaciones de identidad</h2>
        <p className="muted">
          Comparación facial 1:1 contra la referencia de la misma persona, con prueba de vida.
        </p>
        <DataTable
          caption="Historial de verificaciones de identidad"
          columns={VERIFICATION_COLUMNS}
          rows={driver.verifications}
          getRowId={(item) => item.id}
          emptyMessage="Aún no hay verificaciones registradas."
        />
      </article>

      <article className="card">
        <h2>Datos biométricos sensibles</h2>
        <p className="muted">
          No se muestran por defecto. Cada consulta exige justificación y queda en auditoría.
        </p>
        <div className="grid grid--2">
          <SensitiveAssetSection
            driverId={driver.id}
            kind="photo"
            available={driver.biometricReference?.hasPhoto ?? false}
          />
          <SensitiveAssetSection
            driverId={driver.id}
            kind="template"
            available={driver.biometricReference?.hasTemplate ?? false}
          />
        </div>
      </article>

      <DriverReviewDrawer
        driverId={isReviewing ? driver.id : null}
        onClose={() => setReviewing(false)}
      />
    </section>
  );
}
