import { formatDateTime } from '../../shared/utils/date.utils';
import type { AnomalyAssessment } from './alert.types';
import {
  ANOMALY_LEVEL_LABELS,
  contributionShare,
  isAssessmentConsistent,
  rankFactors,
} from './anomalyFactors';

/** Explica de qué se compone el índice operativo de anomalía (RF08). */
export function AnomalyFactorsCard({ assessment }: { assessment: AnomalyAssessment | null }) {
  if (!assessment) {
    return (
      <article className="card">
        <h3>Índice operativo de anomalía</h3>
        <p className="muted">Esta alerta no tiene un índice calculado.</p>
      </article>
    );
  }

  const factors = rankFactors(assessment.factors);
  const consistent = isAssessmentConsistent(assessment);

  return (
    <article className="card">
      <h3>Índice operativo de anomalía</h3>
      <p className="anomaly__value">
        <strong>{assessment.index}</strong> / 100 · {ANOMALY_LEVEL_LABELS[assessment.level]}
      </p>
      <p className="notice notice--info">
        Este índice resume señales operativas del viaje (ruta, paradas, señal y verificaciones) para
        priorizar la revisión. <strong>No es una probabilidad de delito</strong> ni una valoración
        de las personas del viaje.
      </p>

      {!consistent && (
        <p className="notice notice--warning" role="alert">
          La suma de los aportes no coincide con el índice informado. La explicación puede estar
          incompleta: verifica con el equipo técnico antes de usarla.
        </p>
      )}

      {factors.length === 0 ? (
        <p className="muted">El servicio no informó los factores de este índice.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">
              Factores que componen el índice operativo de anomalía
            </caption>
            <thead>
              <tr>
                <th scope="col">Factor</th>
                <th scope="col">Valor observado</th>
                <th scope="col">Peso</th>
                <th scope="col">Aporte</th>
              </tr>
            </thead>
            <tbody>
              {factors.map((factor) => {
                const share = contributionShare(factor, factors);
                return (
                  <tr key={factor.code}>
                    <th scope="row">
                      {factor.label}
                      <span className="muted small block">{factor.description}</span>
                    </th>
                    <td data-label="Valor observado">{factor.observed}</td>
                    <td data-label="Peso">{Math.round(factor.weight * 100)} %</td>
                    <td data-label="Aporte">
                      {factor.contribution} pts ({share} %)
                      <span className="bar" aria-hidden="true">
                        <span className="bar__fill" style={{ width: `${share}%` }} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted small">
        Calculado el {formatDateTime(assessment.computedAt)} · modelo {assessment.modelVersion}
      </p>
    </article>
  );
}
