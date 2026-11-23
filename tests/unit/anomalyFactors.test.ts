import { describe, expect, it } from 'vitest';
import type { AnomalyAssessment, AnomalyFactor } from '../../src/features/incidents/alert.types';
import { deliveryBadge } from '../../src/features/incidents/alertPresentation';
import {
  contributionShare,
  describeContribution,
  isAssessmentConsistent,
  rankFactors,
  totalContribution,
} from '../../src/features/incidents/anomalyFactors';
import { createEventDeduplicator } from '../../src/shared/api/wsClient';

function factor(code: string, contribution: number): AnomalyFactor {
  return {
    code,
    label: `Factor ${code}`,
    description: 'Descripción de prueba',
    observed: '10 m',
    weight: 0.25,
    contribution,
  };
}

function assessment(index: number, factors: AnomalyFactor[]): AnomalyAssessment {
  return {
    index,
    level: 'medium',
    computedAt: '2026-01-01T12:00:00Z',
    modelVersion: 'test',
    factors,
  };
}

describe('anomaly factors (RF08)', () => {
  const factors = [factor('a', 12), factor('b', 30), factor('c', 0), factor('d', 20)];

  it('ranks factors from highest to lowest contribution without mutating the input', () => {
    const original = [...factors];
    expect(rankFactors(factors).map((item) => item.code)).toEqual(['b', 'd', 'a', 'c']);
    expect(factors).toEqual(original);
  });

  it('adds up the contributions', () => {
    expect(totalContribution(factors)).toBe(62);
    expect(totalContribution([])).toBe(0);
  });

  it('computes the share of each factor as a percentage of the total', () => {
    expect(contributionShare(factor('b', 30), factors)).toBe(48);
    expect(contributionShare(factor('c', 0), factors)).toBe(0);
  });

  it('returns a zero share when nothing contributes', () => {
    const empty = [factor('a', 0), factor('b', 0)];
    expect(contributionShare(factor('a', 0), empty)).toBe(0);
  });

  it('accepts an index that equals the sum of its factors', () => {
    expect(isAssessmentConsistent(assessment(62, factors))).toBe(true);
  });

  it('flags an index that its factors do not explain', () => {
    expect(isAssessmentConsistent(assessment(80, factors))).toBe(false);
    expect(isAssessmentConsistent(assessment(40, []))).toBe(false);
  });

  it('explains every factor, including the ones that contribute nothing', () => {
    expect(describeContribution(factor('b', 30))).toContain('aporta 30 puntos');
    expect(describeContribution(factor('x', 1))).toContain('aporta 1 punto ');
    expect(describeContribution(factor('c', 0))).toContain('no aporta');
  });

  it('never words a factor as a probability or a crime prediction', () => {
    const texts = factors.map(describeContribution).join(' ').toLowerCase();
    for (const forbidden of ['probabilidad', 'delito', 'crimen', 'sospech', 'peligros']) {
      expect(texts).not.toContain(forbidden);
    }
  });
});

describe('delivery status (RNF03)', () => {
  const base = {
    id: 'DL-1',
    channel: 'push' as const,
    destination: 'Contacto de confianza',
    attempts: 1,
    lastAttemptAt: '2026-01-01T12:00:00Z',
  };

  it('shows "delivered" only with a confirmation from the backend', () => {
    const confirmed = deliveryBadge({
      ...base,
      status: 'delivered',
      confirmedAt: '2026-01-01T12:00:05Z',
    });
    expect(confirmed).toEqual({ tone: 'success', label: 'Entrega confirmada' });
  });

  it('keeps "sent" visible as unconfirmed', () => {
    const sent = deliveryBadge({ ...base, status: 'sent', confirmedAt: null });
    expect(sent.tone).toBe('warning');
    expect(sent.label).toContain('sin confirmación');
  });

  it('does not trust a "delivered" status that lacks the confirmation time', () => {
    const inconsistent = deliveryBadge({ ...base, status: 'delivered', confirmedAt: null });
    expect(inconsistent.tone).not.toBe('success');
  });
});

describe('event deduplication (RNF04)', () => {
  it('accepts an event once and ignores its replays', () => {
    const deduplicator = createEventDeduplicator();
    expect(deduplicator.isDuplicate('E-1')).toBe(false);
    expect(deduplicator.isDuplicate('E-1')).toBe(true);
    expect(deduplicator.isDuplicate('E-2')).toBe(false);
  });

  it('forgets the oldest ids beyond its capacity', () => {
    const deduplicator = createEventDeduplicator(2);
    deduplicator.isDuplicate('E-1');
    deduplicator.isDuplicate('E-2');
    deduplicator.isDuplicate('E-3');
    expect(deduplicator.isDuplicate('E-3')).toBe(true);
    expect(deduplicator.isDuplicate('E-1')).toBe(false);
  });
});
