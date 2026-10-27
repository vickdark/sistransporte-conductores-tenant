import { computed, ref } from 'vue';
import type { Account, Company, LoginResponse } from './types';

/**
 * La sesión de la app: el token de la empresa, su dirección (`api_url`) y la cuenta. Se guarda en el
 * almacenamiento del WebView para seguir ingresado al reabrir la app; el servidor decide cuándo vence
 * (30 días) o si se revocó (responde 401).
 */
export interface Session {
  token: string;
  tokenExpiresAt: string;
  apiUrl: string;
  company: Company;
  account: Account;
}

const STORAGE_KEY = 'driver_session_v1';

function read(): Session | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<Session> | null;

    // Una sesión incompleta (dañada o de otra versión) se descarta: hay que volver a ingresar.
    return saved?.token && saved.apiUrl && saved.tokenExpiresAt && saved.account && saved.company ? (saved as Session) : null;
  } catch {
    return null;
  }
}

const current = ref<Session | null>(read());

export const session = computed(() => current.value);

/** Hay sesión y el token no ha vencido. */
export function isSignedIn(): boolean {
  return current.value !== null && new Date(current.value.tokenExpiresAt).getTime() > Date.now();
}

export function saveSession(response: LoginResponse): void {
  current.value = {
    token: response.token,
    tokenExpiresAt: response.token_expires_at,
    apiUrl: response.api_url.replace(/\/?$/, '/'),
    company: response.company,
    account: response.account,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current.value));
}

export function clearSession(): void {
  current.value = null;
  localStorage.removeItem(STORAGE_KEY);
}

/** El nombre del conductor (o de la cuenta) para saludar. */
export const driverName = computed(() => current.value?.account.driver?.name ?? current.value?.account.name ?? 'Conductor');
