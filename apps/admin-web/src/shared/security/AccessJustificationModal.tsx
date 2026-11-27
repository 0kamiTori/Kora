import { useEffect, useId, useState, type FormEvent } from 'react';
import { errorMessage } from '../api/client';
import { Modal } from '../ui/Modal';
import { JUSTIFICATION_MIN_LENGTH, validateJustification } from '../utils/validators';

interface AccessJustificationModalProps {
  open: boolean;
  /** Qué se va a consultar, p. ej. "la fotografía de referencia de D-01". */
  resourceLabel: string;
  isSubmitting: boolean;
  error: unknown;
  onConfirm: (justification: string) => void;
  onCancel: () => void;
}

/** Pide la justificación antes de consultar un dato sensible (RNF02). */
export function AccessJustificationModal({
  open,
  resourceLabel,
  isSubmitting,
  error,
  onConfirm,
  onCancel,
}: AccessJustificationModalProps) {
  const [justification, setJustification] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const fieldId = useId();
  const errorId = useId();

  useEffect(() => {
    if (open) {
      setJustification('');
      setValidationError(null);
    }
  }, [open]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const problem = validateJustification(justification);
    setValidationError(problem);
    if (!problem) onConfirm(justification);
  };

  const shownError = validationError ?? (error ? errorMessage(error) : null);

  return (
    <Modal open={open} title="Justificación de acceso" onClose={onCancel}>
      <form onSubmit={handleSubmit} noValidate>
        <p>
          Vas a consultar <strong>{resourceLabel}</strong>. Es un dato sensible: indica para qué lo
          necesitas.
        </p>
        <p className="notice notice--info">
          La consulta quedará registrada en auditoría con tu usuario, la fecha y esta justificación.
        </p>
        <div className="field">
          <label htmlFor={fieldId}>
            Justificación (mínimo {JUSTIFICATION_MIN_LENGTH} caracteres)
          </label>
          <textarea
            id={fieldId}
            rows={4}
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
            aria-invalid={shownError ? true : undefined}
            aria-describedby={shownError ? errorId : undefined}
            required
          />
          {shownError && (
            <p id={errorId} className="field__error" role="alert">
              {shownError}
            </p>
          )}
        </div>
        <div className="actions actions--end">
          <button type="button" className="btn" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
            {isSubmitting ? 'Consultando…' : 'Registrar y consultar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
