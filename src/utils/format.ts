import type { ServiceTab } from '@/api/types';

export const tabTitles: Record<ServiceTab, string> = {
  pending: 'Pendientes',
  in_progress: 'En curso',
  completed: 'Completados',
  cancelled: 'Cancelados',
  support: 'De apoyo',
};

/** «18/10/2026 9:00 PM» (o solo la fecha). */
export function formatDate(iso: string | null | undefined, withTime = true): string {
  if (!iso) {
    return '—';
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}),
  });
}

/** «lun, 19 oct, 9:00 a. m.», como en el portal. */
export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

/** «lun, 19 de oct» para agrupar por día. */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatKm(value: number | string | null | undefined): string {
  return value === null || value === undefined || value === '' ? '—' : `${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 })} km`;
}
