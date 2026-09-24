import Dexie, { type EntityTable } from 'dexie';
import type { Equipment } from './equipment';
import { newId } from './id';
import type { CallType, LineItem } from './invoice';
import type { MaintenanceScope } from './procedures';

/**
 * On-device storage.
 *
 * IndexedDB is the source of truth for a job, not a cache in front of a server.
 * Technicians work in attics, crawlspaces and rooftops where there is no signal,
 * and an app that needs a network round trip to record a capacitor is an app
 * that does not work when it matters. Phase 2b adds a server that reconciles
 * against this, not one this defers to. See docs/adr/0003 and 0006.
 */

export type JobStatus = 'draft' | 'completed';

export interface Job {
  id: string;
  createdAt: number;
  updatedAt: number;
  status: JobStatus;
  /** How the technician recognizes this job later — a name or an address. */
  customer: string;
  unit: string;
  callType: CallType;
  maintenanceScope: MaintenanceScope;
  lines: LineItem[];
}

class ManifoldDatabase extends Dexie {
  jobs!: EntityTable<Job, 'id'>;
  equipment!: EntityTable<Equipment, 'id'>;

  constructor() {
    super('manifold');
    // `status` and `updatedAt` are indexed because every query is either "the
    // open draft" or "recent work, newest first".
    this.version(1).stores({ jobs: 'id, status, updatedAt' });
    // Equipment is looked up by customer and listed newest first. Adding a
    // table leaves existing jobs untouched, so no upgrade function is needed.
    this.version(2).stores({
      jobs: 'id, status, updatedAt',
      equipment: 'id, customer, updatedAt',
    });
  }
}

let instance: ManifoldDatabase | null = null;

/**
 * Opens the database on first use.
 *
 * Constructed lazily so importing this module during server rendering never
 * touches `indexedDB`, which does not exist there.
 */
export function db(): ManifoldDatabase {
  instance ??= new ManifoldDatabase();
  return instance;
}

/** Test seam: drops the cached handle so a test can point at a fresh database. */
export function resetDbForTests(): void {
  instance = null;
}

export function createJob(): Job {
  const now = Date.now();
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    customer: '',
    unit: '',
    callType: 'no-cooling',
    maintenanceScope: 'cooling',
    lines: [],
  };
}

export async function saveJob(job: Job): Promise<void> {
  await db().jobs.put({ ...job, updatedAt: Date.now() });
}

export async function getJob(id: string): Promise<Job | undefined> {
  return db().jobs.get(id);
}

/**
 * The draft the technician was last working on.
 *
 * There is only ever one open draft: finishing a job completes it and starts a
 * new one, so a tech never has to pick which half-written ticket is the live
 * one while standing on a roof.
 */
export async function findOpenDraft(): Promise<Job | undefined> {
  const drafts = await db().jobs.where('status').equals('draft').toArray();
  return drafts.sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

/** Most recently touched first — the order a technician looks for work in. */
export async function listJobs(limit = 100): Promise<Job[]> {
  return db().jobs.orderBy('updatedAt').reverse().limit(limit).toArray();
}

export async function deleteJob(id: string): Promise<void> {
  await db().jobs.delete(id);
}

/** Total pieces recorded on a job, for the history list. */
export function jobPartCount(job: Job): number {
  return job.lines.reduce((total, line) => total + line.quantity, 0);
}

export async function saveEquipment(equipment: Equipment): Promise<void> {
  await db().equipment.put({ ...equipment, updatedAt: Date.now() });
}

export async function getEquipment(id: string): Promise<Equipment | undefined> {
  return db().equipment.get(id);
}

/** Most recently touched first, so what was just photographed is on top. */
export async function listEquipment(limit = 300): Promise<Equipment[]> {
  return db().equipment.orderBy('updatedAt').reverse().limit(limit).toArray();
}

export async function deleteEquipment(id: string): Promise<void> {
  await db().equipment.delete(id);
}
