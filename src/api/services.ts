import { api } from './client';
import { appendPhoto, cameraToken } from './photos';
import type { CapturedPhoto, Home, Paginated, Service, ServiceDetail, ServiceTab } from './types';

/** El inicio: conteos por estado, el servicio en curso y el próximo. */
export function home(): Promise<Home> {
  return api<Home>('home');
}

/** Los servicios de una pestaña, por páginas, con búsqueda por número, cliente, ruta o placa. */
export function services(status: ServiceTab, page = 1, search = ''): Promise<Paginated<Service>> {
  return api<Paginated<Service>>('services', { query: { status, page, search, per_page: 25 } });
}

export async function service(id: number): Promise<ServiceDetail> {
  return (await api<{ data: ServiceDetail }>(`services/${id}`)).data;
}

/** Iniciar o finalizar con el km y la foto del tablero. */
export async function recordMileage(id: number, stage: 'start' | 'finish', mileage: string, photo: CapturedPhoto): Promise<ServiceDetail> {
  const form = new FormData();
  form.append('mileage', mileage);
  appendPhoto(form, 'photo', photo, await cameraToken());

  return (await api<{ data: ServiceDetail }>(`services/${id}/${stage}`, { form })).data;
}

export async function requestSupport(id: number): Promise<ServiceDetail> {
  return (await api<{ data: ServiceDetail }>(`services/${id}/support`, { method: 'POST' })).data;
}
