import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type FormEvent } from 'react';
import { errorMessage } from '../../shared/api/client';
import { DataTable, type Column } from '../../shared/ui/DataTable';
import { StatusBadge, type BadgeDescriptor } from '../../shared/ui/StatusBadge';
import { formatDate, formatDateTime } from '../../shared/utils/date.utils';
import { REASON_MIN_LENGTH, validateReason } from '../../shared/utils/validators';
import {
  PRIVACY_STATUS_LABELS,
  PRIVACY_TRANSITIONS,
  PRIVACY_TYPE_LABELS,
  type PrivacyRequest,
  type PrivacyRequestStatus,
} from './audit.types';
import { listPrivacyRequests, updatePrivacyRequest } from './auditPrivacy.api';

const QUERY_KEY = ['privacy-requests'] as const;

const TONES: Readonly<Record<PrivacyRequestStatus, BadgeDescriptor['tone']>> = {
  received: 'warning',
  in_review: 'info',
  completed: 'success',
  rejected: 'neutral',
};

const statusBadge = (status: PrivacyRequestStatus): BadgeDescriptor => ({
  tone: TONES[status],
  label: PRIVACY_STATUS_LABELS[status],
});

const SUBJECT_LABELS: Readonly<Record<PrivacyRequest['subjectRole'], string>> = {
  passenger: 'Pasajera',
  driver: 'Conductora',
  trusted_contact: 'Contacto de confianza',
};

function RequestDetail({ request }: { request: PrivacyRequest }) {
  const queryClient = useQueryClient();
  const nextStates = PRIVACY_TRANSITIONS[request.status];
  const [status, setStatus] = useState<PrivacyRequestStatus | ''>('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ status?: string; note?: string }>({});
  const statusId = useId();
  const noteId = useId();

  const update = useMutation({
    mutationFn: (payload: { status: PrivacyRequestStatus; note: string }) =>
      updatePrivacyRequest(request.id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setStatus('');
      setNote('');
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const statusError = status === '' ? 'Selecciona el nuevo estado.' : null;
    const noteError = validateReason(note, 'la nota de gestión');
    setErrors({ status: statusError ?? undefined, note: noteError ?? undefined });
    if (status === '' || noteError) return;
    update.mutate({ status, note: note.trim() });
  };

  return (
    <article className="card" aria-label={`Solicitud ${request.id}`}>
      <h2>
        {PRIVACY_TYPE_LABELS[request.type]} · {request.id}
      </h2>
      <p>
        <StatusBadge {...statusBadge(request.status)} />
      </p>
      <dl className="kv">
        <div>
          <dt>Titular</dt>
          <dd>
            {request.subjectAlias} ({SUBJECT_LABELS[request.subjectRole]})
          </dd>
        </div>
        <div>
          <dt>Recibida</dt>
          <dd>{formatDateTime(request.createdAt)}</dd>
        </div>
        <div>
          <dt>Fecha límite de respuesta</dt>
          <dd>{formatDate(request.dueAt)}</dd>
        </div>
      </dl>

      <h3>Trazabilidad</h3>
      <ol className="timeline">
        {request.history.map((event, index) => (
          <li key={`${event.at}-${index}`}>
            <strong>{PRIVACY_STATUS_LABELS[event.status]}</strong>
            <span className="muted small">
              {' '}
              · {formatDateTime(event.at)} · {event.actor}
            </span>
            <div>{event.note}</div>
          </li>
        ))}
      </ol>

      {nextStates.length === 0 ? (
        <p className="muted">La solicitud está cerrada: no admite más cambios de estado.</p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <h3>Actualizar estado</h3>
          <div className="field">
            <label htmlFor={statusId}>Nuevo estado</label>
            <select
              id={statusId}
              value={status}
              onChange={(event) => setStatus(event.target.value as PrivacyRequestStatus | '')}
              aria-invalid={errors.status ? true : undefined}
            >
              <option value="">Selecciona…</option>
              {nextStates.map((value) => (
                <option key={value} value={value}>
                  {PRIVACY_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
            {errors.status && (
              <p className="field__error" role="alert">
                {errors.status}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor={noteId}>Nota de gestión (mínimo {REASON_MIN_LENGTH} caracteres)</label>
            <textarea
              id={noteId}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              aria-invalid={errors.note ? true : undefined}
            />
            {errors.note && (
              <p className="field__error" role="alert">
                {errors.note}
              </p>
            )}
          </div>
          {update.isError && (
            <p className="notice notice--danger" role="alert">
              {errorMessage(update.error)}
            </p>
          )}
          <div className="actions actions--end">
            <button type="submit" className="btn btn--primary" disabled={update.isPending}>
              {update.isPending ? 'Guardando…' : 'Guardar cambio de estado'}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

/** Solicitudes de consulta, retiro de consentimiento y eliminación de datos (RF13, Ley 1581). */
export function PrivacyRequestsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: listPrivacyRequests });
  const selected = query.data?.find((request) => request.id === selectedId) ?? null;

  const columns: Column<PrivacyRequest>[] = [
    {
      id: 'id',
      header: 'Solicitud',
      cell: (request) => (
        <button
          type="button"
          className="link-button"
          onClick={() => setSelectedId(request.id)}
          aria-current={request.id === selectedId ? 'true' : undefined}
        >
          {request.id}
        </button>
      ),
    },
    { id: 'type', header: 'Tipo', cell: (request) => PRIVACY_TYPE_LABELS[request.type] },
    { id: 'subject', header: 'Titular', cell: (request) => request.subjectAlias },
    {
      id: 'status',
      header: 'Estado',
      cell: (request) => <StatusBadge {...statusBadge(request.status)} />,
    },
    {
      id: 'created',
      header: 'Recibida',
      sortValue: (request) => request.createdAt,
      cell: (request) => formatDate(request.createdAt),
    },
    {
      id: 'due',
      header: 'Fecha límite',
      sortValue: (request) => request.dueAt,
      cell: (request) => formatDate(request.dueAt),
    },
  ];

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Solicitudes de datos personales</h1>
          <p className="muted">
            Consulta, retiro de consentimiento y eliminación de datos (Ley 1581 de 2012). Cada
            cambio de estado queda en la trazabilidad de la solicitud y en auditoría.
          </p>
        </div>
      </header>

      <DataTable
        caption="Solicitudes de datos personales"
        columns={columns}
        rows={query.data}
        getRowId={(request) => request.id}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyMessage="No hay solicitudes registradas."
        selectedRowId={selectedId}
      />

      {selected ? (
        <RequestDetail key={`${selected.id}-${selected.status}`} request={selected} />
      ) : (
        query.data &&
        query.data.length > 0 && (
          <p className="muted">Selecciona una solicitud para ver su trazabilidad.</p>
        )
      )}
    </section>
  );
}
