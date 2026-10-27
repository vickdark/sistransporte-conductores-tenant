import { Device } from '@capacitor/device';
import { api, ApiError } from './client';
import { clearSession, saveSession } from './session';
import type { Account, Company, LoginResponse } from './types';

/** El login devolvió varias empresas: el conductor elige una y se repite con `company`. */
export interface ChooseCompany {
  companies: Company[];
}

/** El nombre del teléfono para la bitácora de la empresa (p. ej. «samsung SM-A546E»). */
async function deviceName(): Promise<string> {
  try {
    const info = await Device.getInfo();

    return `${info.manufacturer} ${info.model}`.trim().slice(0, 100) || 'Teléfono';
  } catch {
    return 'Teléfono';
  }
}

/**
 * Login central: guarda la sesión de la empresa del conductor. Los demás errores (credenciales,
 * empresa sin la app, cuenta que no es de conductor…) llegan como ApiError.
 */
export async function login(username: string, password: string, company?: string): Promise<ChooseCompany | null> {
  try {
    const response = await api<LoginResponse>('auth/login', {
      central: true,
      json: { login: username, password, device_name: await deviceName(), company: company ?? null },
    });
    saveSession(response);

    return null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      return { companies: (error.data.companies as Company[] | undefined) ?? [] };
    }

    throw error;
  }
}

/** Cierra la sesión en el servidor (revoca el token) y en el teléfono. */
export async function logout(): Promise<void> {
  try {
    await api('auth/logout', { method: 'POST' });
  } catch {
    // Sin señal o con el token ya vencido, igual se cierra en el teléfono.
  } finally {
    clearSession();
  }
}

/** La cuenta actual (valida el token al abrir la app). */
export async function me(): Promise<Account> {
  return (await api<{ data: Account }>('me')).data;
}
