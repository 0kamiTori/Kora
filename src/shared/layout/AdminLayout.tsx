import { Outlet } from 'react-router-dom';
import { LiveAlertBanner } from '../../features/incidents/LiveAlertBanner';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Estructura de las pantallas privadas: menú, barra superior, alertas en vivo y contenido. */
export function AdminLayout() {
  return (
    <div className="layout">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <Sidebar />
      <div className="layout__main">
        <Topbar />
        <LiveAlertBanner />
        <main id="contenido" className="layout__content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
