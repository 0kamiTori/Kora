import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { errorMessage } from '../../shared/api/client';
import { Modal } from '../../shared/ui/Modal';
import { ErrorState, ForbiddenState, LoadingState } from '../../shared/ui/PageState';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { formatDate } from '../../shared/utils/date.utils';
import type { ReviewDecision } from './driver.types';
import { getDriver, reviewDriver } from './drivers.api';
import { RejectionReasonModal } from './RejectionReasonModal';
import { documentBadge, driverStatusBadge, verificationBadge } from './verificationPresentation';
import { VerificationSummary } from './VerificationSummary';

interface DriverReviewDrawerProps {
  /** null = cerrado. */
  driverId: string | null;
  onClose: () => void;
}

/** Panel lateral para aprobar o rechazar una solicitud de conductora (RF02). */
export function DriverReviewDrawer({ driverId, onClose }: DriverReviewDrawerProps) {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [isRejecting, setRejecting] = useState(false);
  const canReview = hasPermission('drivers:review');

  const query = useQuery({
    queryKey: ['drivers', driverId],
    queryFn: () => getDriver(driverId ?? ''),
    enabled: driverId !== null && canReview,
  });

  const review = useMutation({
    mutationFn: (decision: ReviewDecision) => reviewDriver(driverId ?? '', decision),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setRejecting(false);
      onClose();
    },
  });

  const handleClose = () => {
    review.reset();
    setRejecting(false);
    onClose();
  };

  const driver = query.data;
  const latestVerification = driver?.verifications[0];
  const identityConfirmed = driver?.identityVerification === 'confirmed';
  const isPending = driver?.status === 'pending_review';

  return (
    <Modal
      open={driverId !== null}
      title="Revisión de solicitud"
      onClose={handleClose}
      variant="drawer"
    >
      {!canReview ? (
        <ForbiddenState message="Tu rol no puede aprobar ni rechazar solicitudes." />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !driver ? (
        <LoadingState label="Cargando solicitud…" />
      ) : (
        <>
          <h3>{driver.fullName}</h3>
          <p>
            <StatusBadge {...driverStatusBadge(driver.status)} />{' '}
            <StatusBadge {...verificationBadge(driver.identityVerification)} />
          </p>

          <dl className="kv">
            <div>
              <dt>Documento</dt>
              <dd>{driver.documentNumberMasked}</dd>
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
          </dl>

          <h4>Documentos</h4>
          <ul className="plain-list">
            {driver.documents.map((document) => (
              <li key={document.id}>
                {document.label} <StatusBadge {...documentBadge(document.status)} />
              </li>
            ))}
          </ul>

          <h4>Última verificación de identidad</h4>
          {latestVerification ? (
            <VerificationSummary verification={latestVerification} />
          ) : (
            <p className="muted">Aún no hay verificaciones registradas.</p>
          )}

          {isPending && !identityConfirmed && (
            <p className="notice notice--warning" role="status">
              No se puede aprobar todavía: la verificación de identidad no está confirmada. Una
              verificación pendiente, vencida o fallida no equivale a identidad confirmada.
            </p>
          )}
          {!isPending && (
            <p className="notice notice--info" role="status">
              Esta solicitud ya fue revisada
              {driver.reviewedBy ? ` por ${driver.reviewedBy.name}` : ''}.
              {driver.rejectionReason ? ` Motivo del rechazo: ${driver.rejectionReason}` : ''}
            </p>
          )}

          {review.isError && !isRejecting && (
            <p className="notice notice--danger" role="alert">
              {errorMessage(review.error)}
            </p>
          )}

          {isPending && (
            <div className="actions actions--end">
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  review.reset();
                  setRejecting(true);
                }}
                disabled={review.isPending}
              >
                Rechazar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => review.mutate({ decision: 'approve' })}
                disabled={review.isPending || !identityConfirmed}
              >
                {review.isPending && !isRejecting ? 'Aprobando…' : 'Aprobar'}
              </button>
            </div>
          )}

          <RejectionReasonModal
            open={isRejecting}
            driverName={driver.fullName}
            isSubmitting={review.isPending}
            error={review.isError ? review.error : null}
            onConfirm={(reason) => review.mutate({ decision: 'reject', reason })}
            onCancel={() => {
              review.reset();
              setRejecting(false);
            }}
          />
        </>
      )}
    </Modal>
  );
}
