/**
 * Configuración de entorno del portal.
 *
 * PUNTO DE INTEGRACIÓN: para conectar el backend real, define en `.env.local`
 *   VITE_USE_MOCKS=false, VITE_API_BASE_URL y VITE_WS_URL.
 * Ningún valor de este archivo es un secreto: todo lo que empieza por VITE_ queda
 * visible en el bundle del navegador.
 */
const env = import.meta.env;

export const appConfig = {
  apiBaseUrl: env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
  wsUrl: env.VITE_WS_URL ?? 'ws://localhost:8000/ws/admin',
  /** Mock activo salvo que se indique explícitamente "false". */
  useMocks: env.VITE_USE_MOCKS !== 'false',
  googleMapsKey: env.VITE_GOOGLE_MAPS_WEB_KEY ?? '',
  helpChannelUrl: env.VITE_HELP_CHANNEL_URL ?? '',
} as const;
