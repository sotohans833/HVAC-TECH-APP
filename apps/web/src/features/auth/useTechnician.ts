'use client';

import { useEffect, useSyncExternalStore } from 'react';

export interface SignedInTechnician {
  id: string;
  name: string;
}

/**
 * Who is signed in, shared by every component that asks.
 *
 * A store rather than per-component state because the app bar stays mounted
 * across screens: it first renders on the login page with nobody signed in,
 * and has to learn about the sign-in without a reload.
 */

/** `undefined` means not asked yet (or asked again after a sign-in or out). */
let current: SignedInTechnician | null | undefined;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function load() {
  pending ??= fetch('/api/auth/session')
    .then((response) => (response.ok ? (response.json() as Promise<SignedInTechnician>) : null))
    .catch(() => null)
    .then((technician) => {
      current = technician;
      pending = null;
      notify();
    });
}

/** Call after signing in or out, so everyone asks again. */
export function forgetTechnician(): void {
  current = undefined;
  pending = null;
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The signed-in technician, or null while unknown or signed out. */
export function useTechnician(): SignedInTechnician | null {
  const technician = useSyncExternalStore(
    subscribe,
    () => current,
    () => undefined,
  );
  useEffect(() => {
    if (technician === undefined) load();
  }, [technician]);
  return technician ?? null;
}
