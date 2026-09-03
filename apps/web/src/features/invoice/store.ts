'use client';

import { create } from 'zustand';
import { CATALOG_BY_ID } from '@/lib/catalog';
import type { CallType, LineItem } from '@/lib/invoice';

/**
 * Ticket state for the work order in progress.
 *
 * This is UI state that belongs to the technician's current job, so it lives in
 * Zustand rather than in server cache. Phase 2 persists it to IndexedDB, which
 * is why nothing here assumes a network round trip.
 */
interface TicketState {
  callType: CallType;
  unit: string;
  lines: LineItem[];
  setCallType: (callType: CallType) => void;
  setUnit: (unit: string) => void;
  /** Tapping a tile adds one; tapping again adds another. */
  addPart: (itemId: string) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  removePart: (itemId: string) => void;
  clear: () => void;
}

export const useTicket = create<TicketState>((set) => ({
  callType: 'no-cooling',
  unit: '',
  lines: [],

  setCallType: (callType) => set({ callType }),
  setUnit: (unit) => set({ unit }),

  addPart: (itemId) =>
    set((state) => {
      const existing = state.lines.find((line) => line.itemId === itemId);
      if (existing) {
        return {
          lines: state.lines.map((line) =>
            line.itemId === itemId ? { ...line, quantity: line.quantity + 1 } : line,
          ),
        };
      }

      const item = CATALOG_BY_ID.get(itemId);
      if (!item) return state;

      return {
        lines: [...state.lines, { itemId, quantity: 1, action: item.actions[0] ?? 'replaced' }],
      };
    }),

  setQuantity: (itemId, quantity) =>
    set((state) => ({
      lines:
        quantity < 1
          ? state.lines.filter((line) => line.itemId !== itemId)
          : state.lines.map((line) => (line.itemId === itemId ? { ...line, quantity } : line)),
    })),

  removePart: (itemId) =>
    set((state) => ({ lines: state.lines.filter((line) => line.itemId !== itemId) })),

  clear: () => set({ lines: [], unit: '' }),
}));
