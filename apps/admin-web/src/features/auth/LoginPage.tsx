import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';
import { errorMessage } from '../../shared/api/client';
import { appConfig } from '../../shared/api/config';
import { LoadingState } from '../../shared/ui/PageState';
import { validateEmail, validateRequired } from '../../shared/utils/validators';

function redirectTarget(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const from = (state as { from: unknown }).from;
    // Solo rutas internas: evita redirecciones abiertas.
    if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) return from;
  }
  return '/';
}

/** Inicio de sesión de la administración del piloto (RF01). */
export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [isSubmitting, setSubmitting] = useState(false);

  const target = redirectTarget(location.state);

  if (status === 'loading') return <LoadingState label="Comprobando la sesión…" />;
  if (status === 'authenticated') return <Navigate to={target} replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const emailError = validateEmail(email);
    const passwordError = validateRequired(password, 'la contraseña');
    if (emailError || passwordError) {
      setErrors({ email: emailError ?? undefined, password: passwordError ?? undefined });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(target, { replace: true });
    } catch (error) {
      setErrors({ form: errorMessage(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth">
      <form className="card auth__card" onSubmit={handleSubmit} noValidate>
        <img src="/logos/logo.svg" alt="" width={48} height={48} />
        <h1>Portal administrativo</h1>
        <p className="muted">Plataforma de movilidad segura para mujeres · Piloto</p>

        {errors.form && (
          <p className="notice notice--danger" role="alert">
            {errors.form}
          </p>
        )}

        <div className="field">
          <label htmlFor="login-email">Correo</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'login-email-error' : undefined}
            required
          />
          {errors.email && (
            <p id="login-email-error" className="field__error" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'login-password-error' : undefined}
            required
          />
          {errors.password && (
            <p id="login-password-error" className="field__error" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        <button type="submit" className="btn btn--primary btn--block" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </button>

        <p className="muted small">
          Uso exclusivo del personal autorizado. Las acciones quedan registradas en auditoría.
        </p>

        {appConfig.useMocks && (
          <p className="notice notice--info small">
            Modo demostración con datos ficticios. Usuarios de prueba y contraseña en el README.
          </p>
        )}
      </form>
    </main>
  );
}
