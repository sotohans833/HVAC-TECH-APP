/**
 * The ServiceTitan data the app works with, trimmed to what a technician
 * needs. Shared by the server routes and the screens; the raw API shapes stay
 * inside client.server.ts.
 */

export interface InstalledEquipment {
  id: number;
  name: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  memo: string;
  /** ISO date or null. Shown, never written — see ADR 0008. */
  installedOn: string | null;
}

export interface JobLookup {
  job: { id: number; number: string };
  location: { id: number; name: string; address: string };
  customerName: string | null;
  equipment: InstalledEquipment[];
}

/** The fields the app writes. Nothing else on the record is ever touched. */
export const WRITABLE_FIELDS = [
  'name',
  'serialNumber',
  'model',
  'manufacturer',
  'memo',
] as const;
export type WritableField = (typeof WRITABLE_FIELDS)[number];
export type EquipmentFields = Record<WritableField, string>;

export type ServiceTitanMode = 'production' | 'integration' | 'mock' | 'off';

/** A partial write: only the fields being changed. */
export type EquipmentFieldsPatch = { [K in WritableField]?: string | undefined };
