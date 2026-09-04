'use client';

import { useEffect } from 'react';
import { findOpenDraft, saveJob, type Job } from '@/lib/db';
import { useTicket } from './store';

const SAVE_DEBOUNCE_MS = 400;

/** An untouched job is not worth a row — it would litter the history list. */
function isWorthSaving(job: Job): boolean {
  return job.lines.length > 0 || job.customer.trim() !== '' || job.unit.trim() !== '';
}

/**
 * Keeps the open job in sync with IndexedDB.
 *
 * Loads the draft the technician left open, then writes changes back on a short
 * debounce. Hydration happens in an effect rather than during render so the
 * first client paint matches the server and React never reports a mismatch.
 */
export function useJobPersistence(): { hydrated: boolean } {
  const job = useTicket((state) => state.job);
  const hydrated = useTicket((state) => state.hydrated);
  const load = useTicket((state) => state.load);
  const markHydrated = useTicket((state) => state.markHydrated);

  useEffect(() => {
    if (hydrated) return;

    let cancelled = false;
    findOpenDraft()
      .then((draft) => {
        if (cancelled) return;
        if (draft) load(draft);
      })
      .catch(() => {
        // Private browsing, blocked storage, or a corrupt database. The app
        // still works for this session; it just will not remember the job.
      })
      .finally(() => {
        if (!cancelled) markHydrated();
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, load, markHydrated]);

  useEffect(() => {
    if (!hydrated || !isWorthSaving(job)) return;

    const timer = window.setTimeout(() => {
      void saveJob(job).catch(() => {
        // Same as above: losing the write is survivable, crashing the ticket the
        // technician is standing in front of is not.
      });
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [job, hydrated]);

  return { hydrated };
}
