import { NavLink } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import type { Permission } from '../../features/auth/auth.types';

interface NavItem {
  to: string;
  label: string;
  permission: Permission;
  end?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAVIGATION: NavGroup[] = [
  {
    title: 'Operación',
    items: [
      { to: '/', label: 'Panel', permission: 'dashboard:view', end: true },
      { to: '/drivers', label: 'Conductoras', permission: 'drivers:view' },
      { to: '/trips', label: 'Viajes activos', permission: 'trips:monitor' },
      { to: '/incidents', label: 'Alertas e incidencias', permission: 'alerts:view' },
    ],
  },
  {
    title: 'Gobernanza',
    items: [
      { to: '/governance/parameters', label: 'Parámetros', permission: 'parameters:view' },
      { to: '/governance/audit', label: 'Auditoría', permission: 'audit:view' },
      { to: '/governance/privacy', label: 'Solicitudes de datos', permission: 'privacy:manage' },
    ],
  },
];

/**
 * Menú lateral filtrado por permisos (RBAC).
 * Ocultar un enlace es solo comodidad: el bloqueo real está en ProtectedRoute y en el backend.
 */
export function Sidebar() {
  const { hasPermission } = useAuth();

  return (
    <nav className="sidebar" aria-label="Navegación principal">
      <div className="sidebar__brand">
        <img src="/logos/logo.svg" alt="" width={32} height={32} />
        <span>Movilidad segura</span>
      </div>
      {NAVIGATION.map((group) => {
        const items = group.items.filter((item) => hasPermission(item.permission));
        if (items.length === 0) return null;
        return (
          <div key={group.title} className="sidebar__group">
            <p className="sidebar__title">{group.title}</p>
            <ul>
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
