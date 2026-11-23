/**
 * Cliente HTTP del portal (RNF01).
 *
 * PUNTO DE INTEGRACIÓN: toda llamada REST del portal pasa por `apiRequest`.
 * - Con VITE_USE_MOCKS=true (por defecto) responde el adaptador en memoria `src/mocks`.
 * - Con VITE_USE_MOCKS=false usa `fetch` contra VITE_API_BASE_URL.
 * Las rutas concretas están en cada `features/<feature>/*.api.ts`.
 *
 * DECISIÓN DE SEGURIDAD: el token de acceso vive solo en memoria (variable de módulo).
 * No se guarda en localStorage ni sessionStorage. La renovación depende de una cookie
 * httpOnly que emite el backend (por eso `credentials: 'include'`).
 */
import type { ApiErrorBody } from '../types/common.types';
import { appConfig } from './config';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface TransportRequest {
  method: HttpMethod;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  token: string | null;
  signal?: AbortSignal;
}

export interface TransportResponse {
  status: number;
  body: unknown;
}

export type Transport = (request: TransportRequest) => Promise<TransportResponse>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/* ---------- Transportes ---------- */

const httpTransport: Transport = async ({ method, path, query, body, token, signal }) => {
  const url = new URL(appConfig.apiBaseUrl.replace(/\/$/, '') + path, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include',
    signal,
  });

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  return { status: response.status, body: parsed };
};

const mockTransport: Transport = async (request) => {
  // Import dinámico: el mock no entra al bundle cuando VITE_USE_MOCKS=false.
  const { handleMockRequest } = await import('../../mocks/mockServer');
  return handleMockRequest(request);
};

const transport: Transport = appConfig.useMocks ? mockTransport : httpTransport;

/* ---------- Sesión en memoria ---------- */

let accessToken: string | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;
let unauthorizedHandler: (() => void) | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** `AuthProvider` registra aquí cómo renovar el token y qué hacer si la sesión caduca. */
export function configureSession(handlers: {
  refresh: (() => Promise<string | null>) | null;
  onUnauthorized: (() => void) | null;
}): void {
  refreshHandler = handlers.refresh;
  unauthorizedHandler = handlers.onUnauthorized;
}

/** Una sola renovación a la vez aunque fallen varias peticiones en paralelo. */
function refreshOnce(): Promise<string | null> {
  if (!refreshHandler) return Promise.resolve(null);
  if (!refreshInFlight) {
    refreshInFlight = refreshHandler()
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/* ---------- Errores ---------- */

const DEFAULT_MESSAGES: Readonly<Record<number, string>> = {
  0: 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.',
  400: 'La solicitud no es válida.',
  401: 'Tu sesión expiró. Inicia sesión de nuevo.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No se encontró el recurso solicitado.',
  409: 'La operación entra en conflicto con el estado actual.',
  410: 'El recurso ya no está disponible.',
  422: 'Los datos enviados no son válidos.',
};

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.code === 'string' && typeof candidate.message === 'string';
}

function toApiError(response: TransportResponse): ApiError {
  const fallback =
    DEFAULT_MESSAGES[response.status] ?? 'Ocurrió un error inesperado en el servidor.';
  if (isApiErrorBody(response.body)) {
    return new ApiError(response.status, response.body.code, response.body.message || fallback);
  }
  return new ApiError(response.status, `http_${response.status}`, fallback);
}

/* ---------- API pública ---------- */

export interface RequestOptions {
  method?: HttpMethod;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  /** false para endpoints públicos o de autenticación (no envía token ni renueva). */
  auth?: boolean;
  signal?: AbortSignal;
}

async function send(options: RequestOptions, token: string | null): Promise<TransportResponse> {
  try {
    return await transport({
      method: options.method ?? 'GET',
      path: options.path,
      query: options.query,
      body: options.body,
      token,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'network_error', DEFAULT_MESSAGES[0] ?? 'Sin conexión.');
  }
}

export async function apiRequest<T>(options: RequestOptions): Promise<T> {
  const auth = options.auth ?? true;
  let response = await send(options, auth ? accessToken : null);

  // Interceptor JWT: ante un 401 se intenta renovar una vez y se repite la petición.
  if (response.status === 401 && auth) {
    const renewed = await refreshOnce();
    if (renewed) response = await send(options, renewed);
    if (response.status === 401) unauthorizedHandler?.();
  }

  if (response.status >= 200 && response.status < 300) return response.body as T;
  throw toApiError(response);
}

/** Mensaje en español apto para mostrar en pantalla a partir de cualquier error. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}

export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}
