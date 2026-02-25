export type Role = 'admin' | 'tech' | 'read';

export interface User {
  id: number;
  username: string;
  role: Role;
  status: 'active' | 'inactive';
  last_login?: string;
}

export interface Sede {
  id: number;
  name: string;
  address: string;
  manager: string;
  contact: string;
}

export interface Area {
  id: number;
  name: string;
  sede_id: number;
  sede_name?: string;
  manager: string;
}

export interface Equipo {
  id: number;
  code: string;
  hostname: string;
  serial: string;
  location_type: string;
  last_name: string;
  first_name: string;
  type: string;
  brand: string;
  model: string;
  os: string;
  cpu: string;
  ram: string;
  storage: string;
  storage_type: string;
  office_version: string;
  account_type: string;
  ocs_status: string;
  antivirus: string;
  ip: string;
  mac: string;
  user_assigned: string;
  area_id: number;
  area_name?: string;
  sede_name?: string;
  status: 'Activo' | 'Mantenimiento' | 'Baja';
  acquisition_date: string;
  notes_1: string;
  notes_2: string;
  created_at: string;
}

export interface Mantenimiento {
  id: number;
  equipo_id: number;
  equipo_code?: string;
  hostname?: string;
  type: 'Preventivo' | 'Correctivo';
  date: string;
  technician: string;
  diagnosis: string;
  solution: string;
  cost: number;
  next_date: string;
}

export interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  target_table: string;
  target_id: number;
  details: string;
  timestamp: string;
}
