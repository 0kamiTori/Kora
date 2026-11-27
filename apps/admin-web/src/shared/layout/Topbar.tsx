import { useState } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useRealtime } from '../../app/providers/RealtimeProvider';
import { ROLE_LABELS } from '../../features/auth/auth.types';
import type { ConnectionStatus } from '../api/wsClient';
import { StatusBadge, type BadgeDescriptor } from '../ui/StatusBadge';

const CONNECTION: Readonly<Record<ConnectionStatus, BadgeDescriptor>> = {
  open: { tone: 'success', label: 'Tiempo real: conectado' },
  connecting: { tone: 'warning', label: 'Tiempo real: conectando…' },
  reconnecting: { tone: 'warning', label: 'Tiempo real: reconectando…' },
  closed: { tone: 'danger', label: 'Tiempo real: sin conexión' },
  idle: { tone: 'neutral', label: 'Tiempo real: inactivo' },
};

/** Barra superior: estado del canal en tiempo real y perfil de la sesión. */
export function Topbar() {
  const { user, logout } = useAuth();
  const { status } = useRealtime();
  const [isLeaving, setLeaving] = useState(false);

  const handleLogout = async () => {
    setLeaving(true);
    try {
      await logout();
    } finally {
      setLeaving(false);
    }
  };

  return (
    <header className="topbar">
      <div role="status" aria-live="polite">
        <StatusBadge {...CONNECTION[status]} />
        {status !== 'open' && (
          <span className="topbar__hint">Los datos en pantalla pueden no estar actualizados.</span>
        )}
      </div>
      {user && (
        <div className="topbar__profile">
          <div>
            <p className="topbar__name">{user.fullName}</p>
            <p className="topbar__role">{ROLE_LABELS[user.role]}</p>
          </div>
          <button type="button" className="btn" onClick={handleLogout} disabled={isLeaving}>
            {isLeaving ? 'Saliendo…' : 'Cerrar sesión'}
          </button>
        </div>
      )}
    </header>
  );
}
