'use client';

import { create } from 'zustand';
import { CATALOG_BY_ID, type WorkAction } from '@/lib/catalog';
import { createJob, type Job } from '@/lib/db';
import type { CallType, LineItem } from '@/lib/invoice';
import type { MaintenanceScope } from '@/lib/procedures';

/**
 * The job the technician has open.
 *
 * The whole record lives here, mirroring the shape stored in IndexedDB, so
 * persistence is a single put rather than a mapping layer. `useJobPersistence`
 * loads the open draft on mount and writes changes back; nothing in this file
 * touches storage, which keeps it synchronous and easy to test.
 */
interface TicketState {
  job: Job;
  /** False until the stored draft has been read, so autosave cannot fire early. */
  hydrated: boolean;

  load: (job: Job) => void;
  markHydrated: () => void;
  startNew: () => void;
  /** Files the job away and opens a fresh one. */
  complete: () => void;

  setCustomer: (customer: string) => void;
  setUnit: (unit: string) => void;
  setCallType: (callType: CallType) => void;
  setMaintenanceScope: (scope: MaintenanceScope) => void;

  /** Tapping a tile adds one; tapping again adds another. */
  addPart: (itemId: string) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  setAction: (itemId: string, action: WorkAction) => void;
  /** An empty string clears the cause, which drops it from the invoice. */
  setCause: (itemId: string, causeId: string) => void;
  removePart: (itemId: string) => void;
  clearLines: () => void;
}

function patchLine(lines: LineItem[], itemId: string, patch: Partial<LineItem>): LineItem[] {
  return lines.map((line) => (line.itemId === itemId ? { ...line, ...patch } : line));
}

export const useTicket = create<TicketState>((set) => {
  /** Applies a change to the open job. */
  const edit = (change: (job: Job) => Partial<Job>) =>
    set((state) => ({ job: { ...state.job, ...change(state.job) } }));

  return {
    job: createJob(),
    hydrated: false,

    load: (job) => set({ job }),
    markHydrated: () => set({ hydrated: true }),
    startNew: () => set({ job: createJob() }),
    complete: () => set({ job: createJob() }),

    setCustomer: (customer) => edit(() => ({ customer })),
    setUnit: (unit) => edit(() => ({ unit })),
    setCallType: (callType) => edit(() => ({ callType })),
    setMaintenanceScope: (maintenanceScope) => edit(() => ({ maintenanceScope })),

    addPart: (itemId) =>
      edit((job) => {
        const existing = job.lines.find((line) => line.itemId === itemId);
        if (existing) {
          return { lines: patchLine(job.lines, itemId, { quantity: existing.quantity + 1 }) };
        }

        const item = CATALOG_BY_ID.get(itemId);
        if (!item) return {};

        // The cause is left unset on purpose. It is the technician's judgement,
        // and a guessed default would end up on a customer invoice unread.
        return {
          lines: [...job.lines, { itemId, quantity: 1, action: item.actions[0] ?? 'replaced' }],
        };
      }),

    setQuantity: (itemId, quantity) =>
      edit((job) => ({
        lines:
          quantity < 1
            ? job.lines.filter((line) => line.itemId !== itemId)
            : patchLine(job.lines, itemId, { quantity }),
      })),

    setAction: (itemId, action) =>
      edit((job) => ({ lines: patchLine(job.lines, itemId, { action }) })),

    setCause: (itemId, causeId) =>
      edit((job) => ({
        lines: job.lines.map((line) => {
          if (line.itemId !== itemId) return line;
          if (causeId === '') {
            const { causeId: _cleared, ...rest } = line;
            return rest;
          }
          return { ...line, causeId };
        }),
      })),

    removePart: (itemId) =>
      edit((job) => ({ lines: job.lines.filter((line) => line.itemId !== itemId) })),

    clearLines: () => edit(() => ({ lines: [], unit: '' })),
  };
});
