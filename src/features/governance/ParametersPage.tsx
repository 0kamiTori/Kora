import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { errorMessage } from '../../shared/api/client';
import { DataTable, type Column } from '../../shared/ui/DataTable';
import { ErrorState, LoadingState, EmptyState } from '../../shared/ui/PageState';
import { formatDateTime } from '../../shared/utils/date.utils';
import {
  REASON_MIN_LENGTH,
  validateNumberInRange,
  validateReason,
} from '../../shared/utils/validators';
import type { Parameter, ParameterVersion } from './audit.types';
import {
  PARAMETERS_QUERY_KEY,
  listParameterVersions,
  listParameters,
  updateParameter,
} from './parameters.api';

function versionColumns(unit: string): Column<ParameterVersion>[] {
  return [
    {
      id: 'version',
      header: 'Versión',
      sortValue: (item) => item.version,
      cell: (item) => `v${item.version}`,
    },
    { id: 'when', header: 'Cuándo', cell: (item) => formatDateTime(item.changedAt) },
    { id: 'who', header: 'Quién', cell: (item) => item.changedBy.name },
    {
      id: 'previous',
      header: 'Valor anterior',
      cell: (item) => (item.previousValue === null ? '—' : `${item.previousValue} ${unit}`),
    },
    { id: 'new', header: 'Valor nuevo', cell: (item) => `${item.newValue} ${unit}` },
    { id: 'reason', header: 'Motivo', cell: (item) => item.reason },
  ];
}

function ParameterCard({ parameter, canEdit }: { parameter: Parameter; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<{ value?: string; reason?: string }>({});
  const [saved, setSaved] = useState(false);
  const valueId = useId();
  const reasonId = useId();

  const versions = useQuery({
    queryKey: [...PARAMETERS_QUERY_KEY, parameter.key, 'versions'],
    queryFn: () => listParameterVersions(parameter.key),
  });

  const update = useMutation({
    mutationFn: (request: { value: number; reason: string }) =>
      updateParameter(parameter.key, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PARAMETERS_QUERY_KEY });
      setValue('');
      setReason('');
      setSaved(true);
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    const valueError =
      validateNumberInRange(value, parameter.min, parameter.max, 'El valor') ??
      (Number(value) === parameter.value ? 'El valor nuevo es igual al vigente.' : null);
    const reasonError = validateReason(reason, 'el motivo del cambio');
    setErrors({ value: valueError ?? undefined, reason: reasonError ?? undefined });
    if (valueError || reasonError) return;
    update.mutate({ value: Number(value), reason: reason.trim() });
  };

  return (
    <article className="card" aria-labelledby={`${valueId}-title`}>
      <h2 id={`${valueId}-title`}>{parameter.label}</h2>
      <p className="muted">{parameter.description}</p>
      <p className="parameter__value">
        <strong>
          {parameter.value} {parameter.unit}
        </strong>{' '}
        <span className="muted small">
          · versión {parameter.version} · {parameter.updatedBy.name},{' '}
          {formatDateTime(parameter.updatedAt)}
        </span>
      </p>

      {canEdit ? (
        <form onSubmit={handleSubmit} noValidate className="parameter__form">
          <div className="field">
            <label htmlFor={valueId}>
              Valor nuevo ({parameter.unit}, entre {parameter.min} y {parameter.max})
            </label>
            <input
              id={valueId}
              type="number"
              inputMode="numeric"
              min={parameter.min}
              max={parameter.max}
              step={1}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-invalid={errors.value ? true : undefined}
            />
            {errors.value && (
              <p className="field__error" role="alert">
                {errors.value}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor={reasonId}>
              Motivo del cambio (mínimo {REASON_MIN_LENGTH} caracteres)
            </label>
            <textarea
              id={reasonId}
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              aria-invalid={errors.reason ? true : undefined}
            />
            {errors.reason && (
              <p className="field__error" role="alert">
                {errors.reason}
              </p>
            )}
          </div>
          {update.isError && (
            <p className="notice notice--danger" role="alert">
              {errorMessage(update.error)}
            </p>
          )}
          {saved && (
            <p className="notice notice--success" role="status">
              Cambio guardado como una versión nueva.
            </p>
          )}
          <div className="actions actions--end">
            <button type="submit" className="btn btn--primary" disabled={update.isPending}>
              {update.isPending ? 'Guardando…' : 'Guardar versión nueva'}
            </button>
          </div>
        </form>
      ) : (
        <p className="muted">Tu rol puede consultar los parámetros, pero no modificarlos.</p>
      )}

      <h3>Historial de versiones</h3>
      <DataTable
        caption={`Historial de versiones de ${parameter.label}`}
        columns={versionColumns(parameter.unit)}
        rows={versions.data}
        getRowId={(item) => `${item.key}-${item.version}`}
        isLoading={versions.isLoading}
        error={versions.error}
        onRetry={() => void versions.refetch()}
        emptyMessage="Este parámetro no tiene versiones registradas."
      />
    </article>
  );
}

/** Umbrales operativos versionados (RF07). */
export function ParametersPage() {
  const { hasPermission } = useAuth();
  const query = useQuery({ queryKey: PARAMETERS_QUERY_KEY, queryFn: listParameters });

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Parámetros</h1>
          <p className="muted">
            Umbrales que usa la plataforma para detectar desviaciones, paradas y pérdida de señal.
            Cada cambio crea una versión con responsable, fecha y motivo.
          </p>
        </div>
      </header>

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <LoadingState label="Cargando parámetros…" />
      ) : query.data.length === 0 ? (
        <EmptyState message="No hay parámetros configurados." />
      ) : (
        <div className="stack">
          {query.data.map((parameter) => (
            <ParameterCard
              key={parameter.key}
              parameter={parameter}
              canEdit={hasPermission('parameters:edit')}
            />
          ))}
        </div>
      )}
    </section>
  );
}
