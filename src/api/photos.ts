import { api } from './client';
import type { CapturedPhoto } from './types';

/**
 * El token de cámara que el servidor exige en cada foto (vale 30 minutos para las fotos de la cuenta):
 * la foto viaja con el token como nombre del archivo. Sin él, el servidor la rechaza.
 */
export async function cameraToken(): Promise<string> {
  return (await api<{ token: string }>('camera/token', { method: 'POST' })).token;
}

/** Agrega la foto al formulario con el token como nombre. */
export function appendPhoto(form: FormData, field: string, photo: CapturedPhoto, token: string): void {
  form.append(field, photo.blob, `${token}.${photo.extension}`);
}
