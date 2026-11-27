import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { errorMessage } from '../../shared/api/client';
import { REASON_MIN_LENGTH, validateReason } from '../../shared/utils/validators';
import type { Alert, ResolutionOutcome } from './alert.types';
import { OUTCOME_LABELS } from './alertPresentation';
import { ALERTS_QUERY_KEY, resolveAlert } from './alerts.api';

const OUTCOMES = Object.keys(OUTCOME_LABELS) as ResolutionOutcome[];

/** Cierre de una incidencia con resultado y notas, para trazabilidad (RF12). */
export function IncidentResolutionForm({ alert }: { alert: Alert }) {
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState<ResolutionOutcome | ''>('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ outcome?: string; notes?: string }>({});
  const outcomeId = useId();
  const notesId = useId();

  const resolve = useMutation({
    mutationFn: (payload: { outcome: ResolutionOutcome; notes: string }) =>
      resolveAlert(alert.id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY }),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const notesError = validateReason(notes, 'las notas de resolución');
    const outcomeError = outcome === '' ? 'Selecciona el resultado de la atención.' : null;
    setErrors({ outcome: outcomeError ?? undefined, notes: notesError ?? undefined });
    if (outcome === '' || notesError) return;
    resolve.mutate({ outcome, notes: notes.trim() });
  };

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <h3>Resolver incidencia</h3>
      <div className="field">
        <label htmlFor={outcomeId}>Resultado de la atención</label>
        <select
          id={outcomeId}
          value={outcome}
          onChange={(event) => setOutcome(event.target.value as ResolutionOutcome | '')}
          aria-invalid={errors.outcome ? true : undefined}
          required
        >
          <option value="">Selecciona…</option>
          {OUTCOMES.map((value) => (
            <option key={value} value={value}>
              {OUTCOME_LABELS[value]}
            </option>
          ))}
        </select>
        {errors.outcome && (
          <p className="field__error" role="alert">
            {errors.outcome}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor={notesId}>Notas de resolución (mínimo {REASON_MIN_LENGTH} caracteres)</label>
        <textarea
          id={notesId}
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          aria-invalid={errors.notes ? true : undefined}
          required
        />
        {errors.notes && (
          <p className="field__error" role="alert">
            {errors.notes}
          </p>
        )}
      </div>
      {resolve.isError && (
        <p className="notice notice--danger" role="alert">
          {errorMessage(resolve.error)}
        </p>
      )}
      <div className="actions actions--end">
        <button type="submit" className="btn btn--primary" disabled={resolve.isPending}>
          {resolve.isPending ? 'Guardando…' : 'Registrar resolución'}
        </button>
      </div>
    </form>
  );
}
