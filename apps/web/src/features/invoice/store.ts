'use client';

import { create } from 'zustand';
import { CATALOG_BY_ID, type WorkAction } from '@/lib/catalog';
import type { CallType, LineItem } from '@/lib/invoice';
import type { MaintenanceScope } from '@/lib/procedures';

/**
 * Ticket state for the work order in progress.
 *
 * This is UI state that belongs to the technician's current job, so it lives in
 * Zustand rather than in server cache. Phase 2 persists it to IndexedDB, which
 * is why nothing here assumes a network round trip.
 */
interface TicketState {
  callType: CallType;
  maintenanceScope: MaintenanceScope;
  unit: string;
  lines: LineItem[];
  setCallType: (callType: CallType) => void;
  setMaintenanceScope: (scope: MaintenanceScope) => void;
  setUnit: (unit: string) => void;
  /** Tapping a tile adds one; tapping again adds another. */
  addPart: (itemId: string) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  setAction: (itemId: string, action: WorkAction) => void;
  /** An empty string clears the cause, which drops it from the invoice. */
  setCause: (itemId: string, causeId: string) => void;
  removePart: (itemId: string) => void;
  clear: () => void;
}

/** Applies a change to one line, leaving the rest untouched. */
function patchLine(lines: LineItem[], itemId: string, patch: Partial<LineItem>): LineItem[] {
  return lines.map((line) => (line.itemId === itemId ? { ...line, ...patch } : line));
}

export const useTicket = create<TicketState>((set) => ({
  callType: 'no-cooling',
  maintenanceScope: 'cooling',
  unit: '',
  lines: [],

  setCallType: (callType) => set({ callType }),
  setMaintenanceScope: (maintenanceScope) => set({ maintenanceScope }),
  setUnit: (unit) => set({ unit }),

  addPart: (itemId) =>
    set((state) => {
      const existing = state.lines.find((line) => line.itemId === itemId);
      if (existing) {
        return { lines: patchLine(state.lines, itemId, { quantity: existing.quantity + 1 }) };
      }

      const item = CATALOG_BY_ID.get(itemId);
      if (!item) return state;

      // The cause is left unset on purpose. It is the technician's judgement,
      // and a guessed default would end up on a customer invoice unread.
      return {
        lines: [...state.lines, { itemId, quantity: 1, action: item.actions[0] ?? 'replaced' }],
      };
    }),

  setQuantity: (itemId, quantity) =>
    set((state) => ({
      lines:
        quantity < 1
          ? state.lines.filter((line) => line.itemId !== itemId)
          : patchLine(state.lines, itemId, { quantity }),
    })),

  setAction: (itemId, action) =>
    set((state) => ({ lines: patchLine(state.lines, itemId, { action }) })),

  setCause: (itemId, causeId) =>
    set((state) => ({
      lines: state.lines.map((line) => {
        if (line.itemId !== itemId) return line;
        if (causeId === '') {
          const { causeId: _dropped, ...rest } = line;
          return rest;
        }
        return { ...line, causeId };
      }),
    })),

  removePart: (itemId) =>
    set((state) => ({ lines: state.lines.filter((line) => line.itemId !== itemId) })),

  clear: () => set({ lines: [], unit: '' }),
}));
