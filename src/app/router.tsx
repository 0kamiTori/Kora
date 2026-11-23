import type { ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import type { Permission } from '../features/auth/auth.types';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { DriverDetailPage } from '../features/drivers/DriverDetailPage';
import { DriversListPage } from '../features/drivers/DriversListPage';
import { AuditLogPage } from '../features/governance/AuditLogPage';
import { ParametersPage } from '../features/governance/ParametersPage';
import { PrivacyRequestsPage } from '../features/governance/PrivacyRequestsPage';
import { IncidentsPage } from '../features/incidents/IncidentsPage';
import { PublicLayout } from '../features/public-tracking/PublicLayout';
import { SharedTripPage } from '../features/public-tracking/SharedTripPage';
import { ActiveTripsPage } from '../features/trips/ActiveTripsPage';
import { TripDetailPage } from '../features/trips/TripDetailPage';
import { AdminLayout } from '../shared/layout/AdminLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RealtimeProvider } from './providers/RealtimeProvider';
import { ForbiddenPage, NotFoundPage } from './StatusPages';

const guarded = (permission: Permission, page: ReactNode) => (
  <ProtectedRoute permission={permission}>{page}</ProtectedRoute>
);

export const router = createBrowserRouter([
  /* ---------- Rutas públicas ---------- */
  { path: '/login', element: <LoginPage /> },
  {
    // Vista del Contacto de Confianza: sin sesión, sin menú y sin canal de administración.
    path: '/track/:token',
    element: <PublicLayout />,
    children: [{ index: true, element: <SharedTripPage /> }],
  },

  /* ---------- Rutas privadas (administración) ---------- */
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <RealtimeProvider>
          <AdminLayout />
        </RealtimeProvider>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: guarded('dashboard:view', <DashboardPage />) },
      { path: 'drivers', element: guarded('drivers:view', <DriversListPage />) },
      { path: 'drivers/:driverId', element: guarded('drivers:view', <DriverDetailPage />) },
      { path: 'trips', element: guarded('trips:monitor', <ActiveTripsPage />) },
      { path: 'trips/:tripId', element: guarded('trips:monitor', <TripDetailPage />) },
      { path: 'incidents', element: guarded('alerts:view', <IncidentsPage />) },
      { path: 'governance/parameters', element: guarded('parameters:view', <ParametersPage />) },
      { path: 'governance/audit', element: guarded('audit:view', <AuditLogPage />) },
      { path: 'governance/privacy', element: guarded('privacy:manage', <PrivacyRequestsPage />) },
      { path: 'forbidden', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
