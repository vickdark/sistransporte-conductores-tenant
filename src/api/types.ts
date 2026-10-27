/**
 * Tipos de la API v1 de la app del conductor (contrato: docs/API_APP_CONDUCTOR.md del sistema).
 */

export type ServiceStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/** Pestañas de «Mis servicios»: los estados y los servicios en los que va de apoyo. */
export type ServiceTab = ServiceStatus | 'support';

export interface Company {
  id: string;
  name: string;
}

export interface Account {
  id: number;
  name: string;
  username: string;
  email: string | null;
  driver: { id: number; name: string; document_number: string | null } | null;
  company: { name: string | null; has_logo: boolean };
  token_expires_at: string | null;
}

export interface LoginResponse {
  token: string;
  token_expires_at: string;
  api_url: string;
  company: Company;
  account: Account;
}

export interface Service {
  id: number;
  number: string;
  status: ServiceStatus;
  status_label: string;
  scheduled_at: string;
  client: string | null;
  route: string | null;
  vehicle: string | null;
  passenger_count: number | null;
  description: string | null;
  started_at: string | null;
  finished_at: string | null;
  is_support: boolean;
  support_requested: boolean;
  support_pending: boolean;
}

export interface ServiceDetail extends Service {
  contract_purpose: string | null;
  driver_name: string | null;
  vehicle_mileage: string | null;
  passengers: { id: number; full_name: string; identification_number: string | null; phone: string | null }[];
  supports: { id: number; driver: string | null; vehicle: string | null }[];
  readings: { stage: 'start' | 'finish'; stage_label: string; mileage: string; recorded_at: string }[];
  can: { start: boolean; finish: boolean; request_support: boolean };
}

export interface Home {
  counts: Record<ServiceTab, number>;
  current: Service | null;
  next: Service | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

export interface Vehicle {
  id: number;
  plate: string;
  internal_number: string | null;
  class: string;
  current_mileage: number;
  expired_documents: boolean;
}

/** La orden en curso del conductor («en operación»). */
export interface InOperation {
  id: number;
  number: string;
  client: string | null;
  route: string | null;
  vehicle: { id: number; plate: string; current_mileage: number } | null;
}

export interface ChecklistItem {
  key: string;
  label: string;
  hint: string | null;
  maintenance: boolean;
  answers: { value: string; label: string }[];
}

export interface ChecklistForm {
  groups: { name: string; items: ChecklistItem[] }[];
  driver: { id: number; name: string; expired_documents: boolean } | null;
}

export interface IncidentForm {
  types: { value: number; label: string }[];
  max_photos: number;
  in_operation: InOperation | null;
}

/** Una foto tomada con la cámara, lista para subir. */
export interface CapturedPhoto {
  blob: Blob;
  dataUrl: string;
  extension: string;
}
