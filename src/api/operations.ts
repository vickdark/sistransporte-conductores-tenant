import { api } from './client';
import { appendPhoto, cameraToken } from './photos';
import type { CapturedPhoto, ChecklistForm, InOperation, IncidentForm, Vehicle } from './types';

interface Created {
  message: string;
  data: Record<string, unknown>;
}

/** «AAAA-MM-DDTHH:MM» en la hora del teléfono, como lo recibe el servidor en sus formularios. */
export function localNow(): string {
  const now = new Date();

  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/** Vehículos activos que la cuenta puede ver, por placa o número interno. */
export async function searchVehicles(search: string): Promise<Vehicle[]> {
  return (await api<{ data: Vehicle[] }>('vehicles', { query: { search } })).data;
}

export function checklistForm(): Promise<ChecklistForm> {
  return api<ChecklistForm>('checklists/form');
}

export function saveChecklist(payload: { vehicle_id: number; mileage: number | null; answers: Record<string, { value: string; comment: string | null }> }): Promise<Created> {
  return api<Created>('checklists', { json: payload });
}

export async function fuelLoadForm(): Promise<InOperation | null> {
  return (await api<{ in_operation: InOperation | null }>('fuel-loads/form')).in_operation;
}

export async function saveFuelLoad(data: { vehicleId: number | null; gallons: string; cost: string; mileage: string; mileagePhoto: CapturedPhoto; receiptPhoto: CapturedPhoto }): Promise<Created> {
  const form = new FormData();
  if (data.vehicleId !== null) {
    form.append('vehicle_id', String(data.vehicleId));
  }
  form.append('loaded_at', localNow());
  form.append('gallons', data.gallons);
  form.append('cost', data.cost);
  form.append('mileage', data.mileage);

  const token = await cameraToken();
  appendPhoto(form, 'mileage_photo', data.mileagePhoto, token);
  appendPhoto(form, 'receipt_photo', data.receiptPhoto, token);

  return api<Created>('fuel-loads', { form });
}

export function incidentForm(): Promise<IncidentForm> {
  return api<IncidentForm>('incidents/form');
}

export async function saveIncident(data: { typeId: number; vehicleId: number | null; description: string; photos: CapturedPhoto[] }): Promise<Created> {
  const form = new FormData();
  form.append('incident_type_id', String(data.typeId));
  if (data.vehicleId !== null) {
    form.append('vehicle_id', String(data.vehicleId));
  }
  form.append('reported_at', localNow());
  form.append('description', data.description);

  if (data.photos.length > 0) {
    const token = await cameraToken();
    data.photos.forEach((photo) => appendPhoto(form, 'photos[]', photo, token));
  }

  return api<Created>('incidents', { form });
}
