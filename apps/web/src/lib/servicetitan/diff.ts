import { composeEquipmentName, normalizeIdentifier, type Equipment } from '../equipment';
import type { EquipmentFields, InstalledEquipment, WritableField } from './types';
import { WRITABLE_FIELDS } from './types';

/**
 * The manufacture date goes on the end of the memo ("Attic · Mfd 05/2012")
 * rather than into ServiceTitan's install date: the two are different facts,
 * and warranty questions are settled with the distributor anyway.
 */
export function composeMemo(memo: string, manufactured: string): string {
  const match = /^(\d{4})(?:-(\d{2}))?$/.exec(manufactured.trim());
  const date = match ? (match[2] ? `${match[2]}/${match[1]}` : match[1]) : '';
  return [memo.trim(), date ? `Mfd ${date}` : ''].filter(Boolean).join(' · ');
}

/** A captured unit as the fields it would write in ServiceTitan. */
export function toServiceTitanFields(unit: Equipment): EquipmentFields {
  return {
    name: composeEquipmentName(unit.floor, unit.type),
    serialNumber: normalizeIdentifier(unit.serial),
    model: normalizeIdentifier(unit.model),
    manufacturer: unit.manufacturer.trim(),
    memo: composeMemo(unit.memo, unit.manufactured),
  };
}

/**
 * The memo is the one free-text field the office writes in too, so a captured
 * memo is added to what is there rather than replacing it. Only the parts not
 * already said are appended: "3rd floor attic walk in" plus "Attic · Mfd
 * 05/2012" becomes "3rd floor attic walk in · Mfd 05/2012".
 */
export function mergeMemo(current: string, captured: string): string {
  const existing = current.trim();
  if (!existing) return captured.trim();
  const lower = existing.toLowerCase();
  const additions = captured
    .split(/\s*[·,]\s*/)
    .map((part) => part.trim())
    .filter((part) => part && !lower.includes(part.toLowerCase()));
  return [existing, ...additions].join(' · ');
}

export interface FieldChange {
  field: WritableField;
  from: string;
  to: string;
}

function same(field: WritableField, a: string, b: string): boolean {
  if (field === 'serialNumber' || field === 'model') {
    return normalizeIdentifier(a) === normalizeIdentifier(b);
  }
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * What sending would change. A blank captured field never blanks out what the
 * office already has, and the memo is added to rather than overwritten — the
 * app fills and corrects, it does not erase.
 */
export function diffEquipment(
  current: InstalledEquipment | null,
  next: EquipmentFields,
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const field of WRITABLE_FIELDS) {
    const from = current ? current[field] : '';
    const to = field === 'memo' ? mergeMemo(from, next.memo) : next[field].trim();
    if (to !== '' && !same(field, from, to)) changes.push({ field, from, to });
  }
  return changes;
}

/**
 * Which existing record a captured unit most likely is: the same serial
 * number first, then the same name. Null means it looks new.
 */
export function suggestMatch(
  next: EquipmentFields,
  equipment: readonly InstalledEquipment[],
): InstalledEquipment | null {
  const serial = normalizeIdentifier(next.serialNumber);
  if (serial) {
    const bySerial = equipment.find(
      (unit) => normalizeIdentifier(unit.serialNumber) === serial,
    );
    if (bySerial) return bySerial;
  }
  const name = next.name.trim().toLowerCase();
  if (name) {
    const byName = equipment.find((unit) => unit.name.trim().toLowerCase() === name);
    if (byName) return byName;
  }
  return null;
}
