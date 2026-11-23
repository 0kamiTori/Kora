import { useMemo, useState, type ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingState } from './PageState';

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Si se define, la columna se puede ordenar. */
  sortValue?: (row: T) => string | number;
}

interface DataTableProps<T> {
  /** Descripción de la tabla para lectores de pantalla. */
  caption: string;
  columns: Column<T>[];
  rows: T[] | undefined;
  getRowId: (row: T) => string;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyMessage: string;
  selectedRowId?: string | null;
}

interface SortState {
  columnId: string;
  direction: 'ascending' | 'descending';
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowId,
  isLoading = false,
  error,
  onRetry,
  emptyMessage,
  selectedRowId,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(null);

  const sortedRows = useMemo(() => {
    if (!rows) return [];
    const column = sort ? columns.find((item) => item.id === sort.columnId) : undefined;
    const sortValue = column?.sortValue;
    if (!sort || !sortValue) return rows;
    const factor = sort.direction === 'ascending' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = sortValue(a);
      const right = sortValue(b);
      if (left < right) return -factor;
      if (left > right) return factor;
      return 0;
    });
  }, [rows, sort, columns]);

  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (isLoading && !rows) return <LoadingState />;
  if (!rows || rows.length === 0) return <EmptyState message={emptyMessage} />;

  const toggleSort = (columnId: string) => {
    setSort((current) =>
      current?.columnId === columnId && current.direction === 'ascending'
        ? { columnId, direction: 'descending' }
        : { columnId, direction: 'ascending' },
    );
  };

  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={caption}>
      <table className="table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const active = sort?.columnId === column.id;
              return (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={active ? sort.direction : column.sortValue ? 'none' : undefined}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      className="table__sort"
                      onClick={() => toggleSort(column.id)}
                    >
                      {column.header}
                      <span aria-hidden="true">
                        {active ? (sort.direction === 'ascending' ? ' ▲' : ' ▼') : ' ↕'}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            const id = getRowId(row);
            return (
              <tr key={id} className={id === selectedRowId ? 'is-selected' : undefined}>
                {columns.map((column) => (
                  <td key={column.id} data-label={column.header}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
