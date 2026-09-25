/**
 * The technicians allowed to use the app.
 *
 * Kept in one environment variable, MANIFOLD_TECHNICIANS, rather than a
 * database: a small company has a handful of techs, the list changes a few
 * times a year, and an env var works the same on the office PC today and on a
 * host later. `pnpm tech add "Name"` writes it; nobody edits it by hand.
 *
 * Format: entries separated by `;`, fields by `|` — `id|Name|salt|hash`. The
 * PIN is never stored, only its scrypt hash (see pin.server.ts).
 */

export interface Technician {
  /** Short login name, e.g. `hans-soto`. */
  id: string;
  name: string;
  salt: string;
  hash: string;
}

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function parseTechnicians(raw: string | undefined): Technician[] {
  if (!raw) return [];
  const technicians: Technician[] = [];
  for (const entry of raw.split(';')) {
    const [id, name, salt, hash] = entry.trim().split('|');
    if (id && name && salt && hash && ID_PATTERN.test(id)) {
      technicians.push({ id, name, salt, hash });
    }
  }
  return technicians;
}

export function serializeTechnicians(technicians: readonly Technician[]): string {
  return technicians.map((t) => [t.id, t.name, t.salt, t.hash].join('|')).join(';');
}

export function findTechnician(
  technicians: readonly Technician[],
  id: string,
): Technician | undefined {
  const wanted = id.trim().toLowerCase();
  return technicians.find((t) => t.id === wanted);
}

/**
 * A login name from a person's name: "Hans Soto" → `hans-soto`, with accents
 * dropped so it can be typed on any keyboard, and a number added if the name
 * is already taken.
 */
export function technicianIdFor(name: string, taken: readonly string[] = []): string {
  const base =
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'tech';
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}

/**
 * Names end up inside a quoted .env value, so the format's separators, quotes
 * and `$` (which dotenv expands) cannot appear in them.
 */
export function cleanTechnicianName(name: string): string {
  return name
    .replace(/[|;"$\\\r\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
