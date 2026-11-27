/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_GOOGLE_MAPS_WEB_KEY?: string;
  readonly VITE_USE_MOCKS?: string;
  readonly VITE_HELP_CHANNEL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
