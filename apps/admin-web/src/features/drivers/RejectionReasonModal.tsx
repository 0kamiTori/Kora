import { useEffect, useId, useState, type FormEvent } from 'react';
import { errorMessage } from '../../shared/api/client';
import { Modal } from '../../shared/ui/Modal';
import { REASON_MIN_LENGTH, validateReason } from '../../shared/utils/validators';

interface RejectionReasonModalProps {
  open: boolean;
  driverName: string;
  isSubmitting: boolean;
  error: unknown;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/** RF02: no se puede rechazar una solicitud sin escribir el motivo. */
export function RejectionReasonModal({
  open,
  driverName,
  isSubmitting,
  error,
  onConfirm,
  onCancel,
}: RejectionReasonModalProps) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const fieldId = useId();
  const errorId = useId();

  useEffect(() => {
    if (open) {
      setReason('');
      setValidationError(null);
    }
  }, [open]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const problem = validateReason(reason, 'el motivo del rechazo');
    setValidationError(problem);
    if (!problem) onConfirm(reason.trim());
  };

  const shownError = validationError ?? (error ? errorMessage(error) : null);

  return (
    <Modal open={open} title="Rechazar solicitud" onClose={onCancel}>
      <form onSubmit={handleSubmit} noValidate>
        <p>
          Vas a rechazar la solicitud de <strong>{driverName}</strong>. El motivo queda registrado y
          se comunica a la conductora.
        </p>
        <div className="field">
          <label htmlFor={fieldId}>
            Motivo del rechazo (mínimo {REASON_MIN_LENGTH} caracteres)
          </label>
          <textarea
            id={fieldId}
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
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
          <button type="submit" className="btn btn--danger" disabled={isSubmitting}>
            {isSubmitting ? 'Rechazando…' : 'Confirmar rechazo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
