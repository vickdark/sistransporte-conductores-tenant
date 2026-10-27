/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Dirección de la API central de la plataforma (login), terminada en `/api/v1/`. */
  readonly VITE_CENTRAL_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
