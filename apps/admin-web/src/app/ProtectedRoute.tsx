import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Permission } from '../features/auth/auth.types';
import { LoadingState } from '../shared/ui/PageState';
import { useAuth } from './providers/AuthProvider';

interface ProtectedRouteProps {
  /** Permiso exigido. Sin él basta con tener sesión. */
  permission?: Permission;
  children: ReactNode;
}

/**
 * Guardia de rutas (RNF01): bloquea y redirige.
 * - Sin sesión → /login (recordando a dónde se quería ir).
 * - Con sesión pero sin permiso → /forbidden. La pantalla protegida ni siquiera se monta,
 *   así que tampoco dispara sus consultas.
 * Es defensa en profundidad: el backend debe negar igualmente con 403.
 */
export function ProtectedRoute({ permission, children }: ProtectedRouteProps) {
  const { status, hasPermission } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <LoadingState label="Comprobando la sesión…" />;
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/forbidden" replace />;
  }
  return <>{children}</>;
}
