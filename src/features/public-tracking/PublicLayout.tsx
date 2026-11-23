import { Outlet } from 'react-router-dom';

/**
 * Estructura de la vista pública. No incluye menú, sesión ni ningún dato de
 * administración: quien abre el enlace solo ve el seguimiento de un viaje.
 */
export function PublicLayout() {
  return (
    <div className="public">
      <header className="public__header">
        <img src="/logos/logo.svg" alt="" width={32} height={32} />
        <span>Movilidad segura · Seguimiento compartido</span>
      </header>
      <main className="public__main">
        <Outlet />
      </main>
      <footer className="public__footer">
        <p>
          Recibiste este enlace porque alguien quiso compartir su viaje contigo. Es temporal y deja
          de funcionar cuando el viaje termina, expira o la persona lo desactiva.
        </p>
        <p>
          Esta página solo muestra información. No avisa ni contacta a servicios de emergencia: si
          crees que hay una emergencia, comunícate directamente con la línea de emergencias.
        </p>
      </footer>
    </div>
  );
}
