import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { DataTable, type Column } from '../../shared/ui/DataTable';
import { StatusBadge } from '../../shared/ui/StatusBadge';
import { formatDate } from '../../shared/utils/date.utils';
import type { Driver, DriverStatus } from './driver.types';
import { DriverReviewDrawer } from './DriverReviewDrawer';
import { listDrivers } from './drivers.api';
import {
  DRIVER_STATUS_OPTIONS,
  driverStatusBadge,
  verificationBadge,
} from './verificationPresentation';

/** Listado de conductoras con acceso a la revisión de solicitudes (RF02, RF04, RF05). */
export function DriversListPage() {
  const { hasPermission } = useAuth();
  const canReview = hasPermission('drivers:review');
  const [statusFilter, setStatusFilter] = useState<DriverStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const query = useQuery({ queryKey: ['drivers'], queryFn: listDrivers });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return query.data?.filter(
      (driver) =>
        (statusFilter === 'all' || driver.status === statusFilter) &&
        (term === '' ||
          driver.fullName.toLowerCase().includes(term) ||
          driver.vehicle.plate.toLowerCase().includes(term)),
    );
  }, [query.data, statusFilter, search]);

  const columns: Column<Driver>[] = [
    {
      id: 'name',
      header: 'Conductora',
      sortValue: (driver) => driver.fullName,
      cell: (driver) => <Link to={`/drivers/${driver.id}`}>{driver.fullName}</Link>,
    },
    {
      id: 'status',
      header: 'Solicitud',
      sortValue: (driver) => driver.status,
      cell: (driver) => <StatusBadge {...driverStatusBadge(driver.status)} />,
    },
    {
      id: 'verification',
      header: 'Verificación de identidad',
      cell: (driver) => <StatusBadge {...verificationBadge(driver.identityVerification)} />,
    },
    { id: 'plate', header: 'Placa', cell: (driver) => driver.vehicle.plate },
    {
      id: 'registered',
      header: 'Registro',
      sortValue: (driver) => driver.registeredAt,
      cell: (driver) => formatDate(driver.registeredAt),
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: (driver) =>
        canReview && driver.status === 'pending_review' ? (
          <button
            type="button"
            className="btn btn--small"
            onClick={() => setReviewingId(driver.id)}
            aria-label={`Revisar solicitud de ${driver.fullName}`}
          >
            Revisar
          </button>
        ) : (
          <span className="muted">—</span>
        ),
    },
  ];

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Conductoras</h1>
          <p className="muted">Solicitudes de ingreso y estado de verificación de identidad.</p>
        </div>
      </header>

      <div className="toolbar">
        <div className="field field--inline">
          <label htmlFor="driver-status">Estado de la solicitud</label>
          <select
            id="driver-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as DriverStatus | 'all')}
          >
            <option value="all">Todas</option>
            {DRIVER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field field--inline">
          <label htmlFor="driver-search">Buscar por nombre o placa</label>
          <input
            id="driver-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <DataTable
        caption="Listado de conductoras"
        columns={columns}
        rows={rows}
        getRowId={(driver) => driver.id}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
        emptyMessage="No hay conductoras que coincidan con los filtros."
      />

      <DriverReviewDrawer driverId={reviewingId} onClose={() => setReviewingId(null)} />
    </section>
  );
}
