import { clearSession, session } from './session';

/** La API central (solo el login). */
export const CENTRAL_API_URL = (import.meta.env.VITE_CENTRAL_API_URL ?? '').replace(/\/?$/, '/');

/**
 * Un error de la API con su mensaje en español (listo para mostrar), el código HTTP, el `code` de la
 * API (p. ej. `app_disabled`) y los errores por campo de un 422.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null = null,
    readonly errors: Record<string, string[]> = {},
    readonly data: Record<string, unknown> = {},
  ) {
    super(message);
  }

  /** El primer error de un campo, si lo hay. */
  field(name: string): string | null {
    return this.errors[name]?.[0] ?? null;
  }
}

let onUnauthorized: () => void = () => {};

/** Qué hacer cuando la sesión ya no vale (401): main.ts lleva al login. */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  query?: Record<string, string | number | undefined>;
  json?: unknown;
  form?: FormData;
  /** A la API central (login) en vez de la de la empresa. */
  central?: boolean;
}

/**
 * Una petición a la API v1 con el token de la sesión. Un 401 de la empresa cierra la sesión y lleva
 * al login; cualquier otro error llega como ApiError con el mensaje del servidor.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const base = options.central ? CENTRAL_API_URL : session.value?.apiUrl;

  if (!base) {
    throw new ApiError('Tu sesión venció o se cerró. Vuelve a ingresar.', 401, 'unauthenticated');
  }

  const url = new URL(path.replace(/^\//, ''), base);
  Object.entries(options.query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (!options.central && session.value) {
    headers.Authorization = `Bearer ${session.value.token}`;
  }
  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? (options.json !== undefined || options.form ? 'POST' : 'GET'),
      headers,
      body: options.form ?? (options.json !== undefined ? JSON.stringify(options.json) : undefined),
    });
  } catch {
    throw new ApiError('No hay conexión con el servidor. Revisa tu señal e inténtalo de nuevo.', 0, 'network');
  }

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    if (response.status === 401 && !options.central) {
      clearSession();
      onUnauthorized();
    }

    throw new ApiError(
      typeof data.message === 'string' ? data.message : `El servidor respondió con un error (${response.status}).`,
      response.status,
      typeof data.code === 'string' ? data.code : null,
      (data.errors as Record<string, string[]> | undefined) ?? {},
      data,
    );
  }

  return data as T;
}

/** Un archivo de la empresa (p. ej. su logo) con el token, o null si no existe o no hay señal. */
export async function apiBlob(path: string): Promise<Blob | null> {
  const current = session.value;
  if (!current) {
    return null;
  }

  try {
    const response = await fetch(new URL(path.replace(/^\//, ''), current.apiUrl), { headers: { Authorization: `Bearer ${current.token}` } });

    return response.ok ? await response.blob() : null;
  } catch {
    return null;
  }
}

/** El mensaje para mostrar de cualquier error. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const messages = Object.values(error.errors).flat();

    return messages.length > 1 ? messages.join('\n') : error.message;
  }

  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}
