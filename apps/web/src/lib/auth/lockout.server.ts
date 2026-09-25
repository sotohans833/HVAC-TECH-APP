/**
 * Slows down PIN guessing. A six-digit PIN is a million combinations; five
 * wrong tries per login name locks it for fifteen minutes, which puts guessing
 * one out of reach.
 *
 * Kept in memory, so it resets when the server restarts. That is acceptable
 * for a small team on one server; a hosted deployment with several instances
 * should move this to shared storage.
 */

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

const failures = new Map<string, { count: number; lockedUntil: number }>();

export function isLocked(key: string, now: number = Date.now()): boolean {
  const entry = failures.get(key);
  return entry !== undefined && entry.lockedUntil > now;
}

export function recordFailure(key: string, now: number = Date.now()): void {
  const entry = failures.get(key) ?? { count: 0, lockedUntil: 0 };
  if (entry.lockedUntil !== 0 && entry.lockedUntil <= now) {
    entry.count = 0;
    entry.lockedUntil = 0;
  }
  entry.count += 1;
  if (entry.count >= MAX_FAILURES) entry.lockedUntil = now + LOCK_MS;
  failures.set(key, entry);
}

export function clearFailures(key: string): void {
  failures.delete(key);
}
