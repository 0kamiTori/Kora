/**
 * PUNTO DE INTEGRACIÓN — Autenticación (RF01, RNF01).
 * Cada función corresponde a un endpoint REST que el backend debe exponer.
 * Para integrar: ajusta `path`/`method` si el contrato real difiere y revisa los tipos
 * en `auth.types.ts`. No hay más lugares que tocar.
 */
import { apiRequest } from '../../shared/api/client';
import type { LoginRequest, LoginResponse } from './auth.types';

/** POST /auth/login → LoginResponse. Debe emitir además la cookie httpOnly de renovación. */
export function login(credentials: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>({
    method: 'POST',
    path: '/auth/login',
    body: credentials,
    auth: false,
  });
}

/**
 * POST /auth/refresh → LoginResponse. Sin cuerpo: el backend lee la cookie httpOnly.
 * Se usa al cargar la página (restaurar sesión) y cuando una petición devuelve 401.
 */
export function refreshSession(): Promise<LoginResponse> {
  return apiRequest<LoginResponse>({ method: 'POST', path: '/auth/refresh', auth: false });
}

/** POST /auth/logout → 204. Debe invalidar la cookie de renovación. */
export function logout(): Promise<void> {
  return apiRequest<void>({ method: 'POST', path: '/auth/logout' });
}
