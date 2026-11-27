import type { AnomalyAssessment, AnomalyFactor, AnomalyLevel } from './alert.types';

/**
 * Lógica de presentación del índice operativo de anomalía (RF08).
 * El portal NO calcula el índice: lo recibe del backend y explica cómo se compone.
 */

export const ANOMALY_LEVEL_LABELS: Readonly<Record<AnomalyLevel, string>> = {
  low: 'Nivel operativo bajo',
  medium: 'Nivel operativo medio',
  high: 'Nivel operativo alto',
};

/** Factores de mayor a menor aporte. No modifica el arreglo original. */
export function rankFactors(factors: readonly AnomalyFactor[]): AnomalyFactor[] {
  return [...factors].sort((a, b) => b.contribution - a.contribution);
}

export function totalContribution(factors: readonly AnomalyFactor[]): number {
  return factors.reduce((sum, factor) => sum + factor.contribution, 0);
}

/** Porcentaje (0..100) del índice que explica un factor. */
export function contributionShare(
  factor: AnomalyFactor,
  factors: readonly AnomalyFactor[],
): number {
  const total = totalContribution(factors);
  if (total <= 0) return 0;
  return Math.round((factor.contribution / total) * 100);
}

/**
 * El índice es explicable solo si la suma de aportes coincide con el valor informado.
 * Si no coincide, la pantalla lo avisa en lugar de mostrar una explicación engañosa.
 */
export function isAssessmentConsistent(assessment: AnomalyAssessment, tolerance = 0.5): boolean {
  return Math.abs(totalContribution(assessment.factors) - assessment.index) <= tolerance;
}

/** Frase que explica un factor, sin lenguaje de probabilidad ni de predicción. */
export function describeContribution(factor: AnomalyFactor): string {
  if (factor.contribution <= 0) return `${factor.label}: no aporta al índice en este momento.`;
  const points = factor.contribution === 1 ? 'punto' : 'puntos';
  return `${factor.label}: aporta ${factor.contribution} ${points} (observado: ${factor.observed}).`;
}
