import { Link } from 'react-router-dom';
import { ForbiddenState } from '../shared/ui/PageState';

export function ForbiddenPage() {
  return (
    <section>
      <h1>Acceso restringido</h1>
      <ForbiddenState message="Tu rol no tiene permiso para abrir esta sección. Si crees que es un error, contacta a la administración general." />
      <p>
        <Link to="/">Volver al panel</Link>
      </p>
    </section>
  );
}

export function NotFoundPage() {
  return (
    <section>
      <h1>Página no encontrada</h1>
      <p>La dirección no corresponde a ninguna sección del portal.</p>
      <p>
        <Link to="/">Volver al panel</Link>
      </p>
    </section>
  );
}
