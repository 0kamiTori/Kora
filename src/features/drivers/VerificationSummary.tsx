import { StatusBadge } from '../../shared/ui/StatusBadge';
import { formatDateTime } from '../../shared/utils/date.utils';
import type { Verification } from './driver.types';
import {
  LIVENESS_LABELS,
  RESULT_LABELS,
  VERIFICATION_KIND_LABELS,
  verificationBadge,
} from './verificationPresentation';

/** Detalle de una verificación facial 1:1 con prueba de vida (RF04, RF05). */
export function VerificationSummary({ verification }: { verification: Verification }) {
  return (
    <dl className="kv">
      <div>
        <dt>Tipo</dt>
        <dd>{VERIFICATION_KIND_LABELS[verification.kind]}</dd>
      </div>
      <div>
        <dt>Estado</dt>
        <dd>
          <StatusBadge {...verificationBadge(verification.status)} />
        </dd>
      </div>
      <div>
        <dt>Resultado de la comparación</dt>
        <dd>
          {verification.result ? RESULT_LABELS[verification.result] : 'Sin resultado todavía'}
        </dd>
      </div>
      <div>
        <dt>Puntuación / umbral</dt>
        <dd>
          {verification.score === null ? 'Sin puntuación' : verification.score.toFixed(2)} /{' '}
          {verification.threshold.toFixed(2)}
        </dd>
      </div>
      <div>
        <dt>Prueba de vida</dt>
        <dd>{LIVENESS_LABELS[verification.livenessStatus]}</dd>
      </div>
      <div>
        <dt>Versión del modelo</dt>
        <dd>{verification.modelVersion}</dd>
      </div>
      <div>
        <dt>Solicitada</dt>
        <dd>{formatDateTime(verification.requestedAt)}</dd>
      </div>
      <div>
        <dt>Completada</dt>
        <dd>
          {verification.completedAt ? formatDateTime(verification.completedAt) : 'No completada'}
        </dd>
      </div>
      {verification.dueAt && (
        <div>
          <dt>Fecha límite</dt>
          <dd>{formatDateTime(verification.dueAt)}</dd>
        </div>
      )}
    </dl>
  );
}
