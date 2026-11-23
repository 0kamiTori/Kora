import type { ReactNode } from 'react';
import { errorMessage, isForbidden } from '../api/client';

/** Estados comunes de pantalla: carga, vacío, error y sin permisos. */

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div className="state state--empty">
      <p>{message}</p>
      {children}
    </div>
  );
}

export function ForbiddenState({ message }: { message?: string }) {
  return (
    <div className="state state--forbidden" role="alert">
      <p className="state__title">Sin permisos</p>
      <p>{message ?? 'Tu rol no tiene permiso para ver esta información.'}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (isForbidden(error)) return <ForbiddenState />;
  return (
    <div className="state state--error" role="alert">
      <p className="state__title">No se pudo cargar la información</p>
      <p>{errorMessage(error)}</p>
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
