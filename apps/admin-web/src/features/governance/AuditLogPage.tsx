import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable, type Column } from '../../shared/ui/DataTable';
import { formatDateTime } from '../../shared/utils/date.utils';
import { AUDIT_ACTION_LABELS, type AuditAction, type AuditEntry } from './audit.types';
import { listAuditEntries } from './auditPrivacy.api';

const ACTIONS = Object.keys(AUDIT_ACTION_LABELS) as AuditAction[];

const COLUMNS: Column<AuditEntry>[] = [
  {
    id: 'at',
    header: 'Fecha',
    sortValue: (entry) => entry.at,
    cell: (entry) => formatDateTime(entry.at),
  },
  {
    id: 'actor',
    header: 'Quién',
    sortValue: (entry) => entry.actor.name,
    cell: (entry) => entry.actor.name,
  },
  { id: 'action', header: 'Acción', cell: (entry) => AUDIT_ACTION_LABELS[entry.action] },
  {
    id: 'resource',
    header: 'Recurso',
    cell: (entry) => `${entry.resourceType} ${entry.resourceId}`,
  },
  {
    id: 'justification',
    header: 'Justificación',
    cell: (entry) => entry.justification ?? <span className="muted">No aplica</span>,
  },
  {
    id: 'detail',
    header: 'Detalle',
    cell: (entry) => entry.detail ?? <span className="muted">—</span>,
  },
];

/** Registro de auditoría de solo lectura (RF12). */
export function AuditLogPage() {
  const [action, setAction] = useState<AuditAction | 'all'>('all');
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['audit-log'], queryFn: listAuditEntries });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return query.data?.filter(
      (entry) =>
        (action === 'all' || entry.action === action) &&
        (term === '' ||
          entry.actor.name.toLowerCase().includes(term) ||
          entry.resourceId.toLowerCase().includes(term)),
    );
  }, [query.data, action, search]);

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Auditoría</h1>
          <p className="muted">
            Registro de acciones administrativas y de consultas a datos sensibles. Es de solo
            lectura.
          </p>
        </div>
      </header>

      <div className="toolbar">
        <div className="field field--inline">
          <label htmlFor="audit-action">Acción</label>
          <select
            id="audit-action"
            value={action}
            onChange={(event) => setAction(event.target.value as AuditAction | 'all')}
          >
            <option value="all">Todas</option>
            {ACTIONS.map((value) => (
              <option key={value} value={value}>
                {AUDIT_ACTION_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="field field--inline">
          <label htmlFor="audit-search">Buscar por persona o recurso</label>
          <input
            id="audit-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <DataTable
        caption="Registro de auditoría"
        columns={COLUMNS}
        rows={rows}
        getRowId={(entry) => entry.id}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyMessage="No hay registros que coincidan con los filtros."
      />
    </section>
  );
}
