/**
 * Installed equipment at a customer's location.
 *
 * The record mirrors the fields ServiceTitan keeps for installed equipment —
 * name, serial, model, manufacturer, memo — so what the technician captures
 * here goes across field for field, whether that is by copy and paste today or
 * through the ServiceTitan API later. See docs/adr/0007.
 *
 * Like the part catalog, labels are bilingual records: the technician picks
 * "Segundo piso" and "Serpentín evaporador", and the name that goes into
 * ServiceTitan comes out as "2nd floor evap coil", in the same wording the
 * office already uses there.
 */

import { newId } from './id';

/** A label in both languages, as in the part catalog. */
export interface Bilingual {
  en: string;
  es: string;
}

export const EQUIPMENT_TYPES = [
  'furnace',
  'condenser',
  'evap-coil',
  'air-handler',
  'heat-pump',
  'package-unit',
  'mini-split',
  'water-heater',
  'tankless-water-heater',
  'thermostat',
  'other',
] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, Bilingual> = {
  furnace: { es: 'Furnace (calefactor)', en: 'Furnace' },
  condenser: { es: 'Condensador', en: 'Condenser' },
  'evap-coil': { es: 'Serpentín evaporador', en: 'Evaporator coil' },
  'air-handler': { es: 'Manejadora de aire', en: 'Air handler' },
  'heat-pump': { es: 'Bomba de calor', en: 'Heat pump' },
  'package-unit': { es: 'Unidad paquete', en: 'Package unit' },
  'mini-split': { es: 'Mini split', en: 'Mini split' },
  'water-heater': { es: 'Calentador de agua', en: 'Water heater' },
  'tankless-water-heater': { es: 'Calentador sin tanque', en: 'Tankless water heater' },
  thermostat: { es: 'Termostato', en: 'Thermostat' },
  other: { es: 'Otro', en: 'Other' },
};

/** The noun used in the equipment name, matching how the office writes it. */
const EQUIPMENT_NAME_NOUN: Record<EquipmentType, string> = {
  furnace: 'furnace',
  condenser: 'condenser',
  'evap-coil': 'evap coil',
  'air-handler': 'air handler',
  'heat-pump': 'heat pump',
  'package-unit': 'package unit',
  'mini-split': 'mini split',
  'water-heater': 'water heater',
  'tankless-water-heater': 'tankless water heater',
  thermostat: 'thermostat',
  other: 'equipment',
};

/** Which part of the house the equipment serves — the first word of its name. */
export const EQUIPMENT_FLOORS = [
  'downstairs',
  'upstairs',
  '1st-floor',
  '2nd-floor',
  '3rd-floor',
  'basement',
  'whole-house',
] as const;

export type EquipmentFloor = (typeof EQUIPMENT_FLOORS)[number];

export const EQUIPMENT_FLOOR_LABELS: Record<EquipmentFloor, Bilingual> = {
  downstairs: { es: 'Planta baja', en: 'Downstairs' },
  upstairs: { es: 'Planta alta', en: 'Upstairs' },
  '1st-floor': { es: 'Primer piso', en: '1st floor' },
  '2nd-floor': { es: 'Segundo piso', en: '2nd floor' },
  '3rd-floor': { es: 'Tercer piso', en: '3rd floor' },
  basement: { es: 'Sótano', en: 'Basement' },
  'whole-house': { es: 'Toda la casa', en: 'Whole house' },
};

/**
 * Where the unit physically sits, offered as one-tap memo text. The memo is
 * free text in ServiceTitan, so these are shortcuts, not a closed list, and they
 * are written in English because that is what the office reads.
 */
export const MEMO_SHORTCUTS = [
  'Attic',
  'Crawlspace',
  'Closet',
  'Garage',
  'Basement',
  'Roof',
  'Right side',
  'Left side',
  'Back',
] as const;

export interface Equipment {
  id: string;
  createdAt: number;
  updatedAt: number;
  /** Name or address, the same way jobs are labeled. Groups the list. */
  customer: string;
  /** Empty until the technician picks one. */
  floor: EquipmentFloor | '';
  type: EquipmentType | '';
  manufacturer: string;
  model: string;
  serial: string;
  /** `YYYY-MM`, or empty. From the plate, the serial decoder, or by hand. */
  manufactured: string;
  memo: string;
  /** The nameplate photo, downscaled. Kept so a reading can be checked later. */
  photo?: Blob | undefined;
  /** When the technician marked it as entered in ServiceTitan. */
  enteredInServiceTitanAt?: number | undefined;
  /** The ServiceTitan job this was captured on, as the technician typed it. */
  jobNumber?: string | undefined;
  /** The ServiceTitan location the job is at. */
  serviceTitanLocationId?: number | undefined;
  /** The installed-equipment record this was sent to, once it has been. */
  serviceTitanEquipmentId?: number | undefined;
  /** Who captured it, for the record ServiceTitan attributes to the app. */
  capturedBy?: string | undefined;
}

export function createEquipment(customer = ''): Equipment {
  const now = Date.now();
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    customer,
    floor: '',
    type: '',
    manufacturer: '',
    model: '',
    serial: '',
    manufactured: '',
    memo: '',
  };
}

/**
 * The equipment name as ServiceTitan shows it: "2nd floor furnace",
 * "Downstairs condenser". Either half can be missing while the record is being
 * filled in, and an empty record has no name at all.
 */
export function composeEquipmentName(
  floor: EquipmentFloor | '',
  type: EquipmentType | '',
): string {
  const parts = [
    floor ? EQUIPMENT_FLOOR_LABELS[floor].en : '',
    type ? EQUIPMENT_NAME_NOUN[type] : '',
  ].filter(Boolean);
  const name = parts.join(' ');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Cleans a model or serial number as read off a plate or typed with gloves on:
 * trims, uppercases, and collapses runs of whitespace. Dashes are kept because
 * they are part of real model numbers (SLP99UH110XV60C-02).
 */
export function normalizeIdentifier(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, ' ');
}

export interface DecodedSerial {
  year: number;
  /** 1–12, when the format encodes a month. */
  month?: number | undefined;
  /** 1–53, when the format encodes a week instead. */
  week?: number | undefined;
}

const LENNOX_MONTHS = 'ABCDEFGHJKLM'; // no I, which reads as a 1 on a plate

function fullYear(twoDigits: number, now: Date): number {
  const century = twoDigits <= now.getFullYear() % 100 ? 2000 : 1900;
  return century + twoDigits;
}

function brandOf(manufacturer: string): string {
  return manufacturer.trim().toLowerCase();
}

/**
 * Reads the manufacture date out of a serial number, for the brands whose
 * format is well documented. Returns null rather than guessing when the brand
 * is unknown or the serial does not fit the pattern — a wrong age is worse than
 * no age, because it goes into warranty conversations.
 *
 * - Lennox (and Armstrong, Ducane, AirEase): `PPYY M NNNNN`, plant, year, and a
 *   month letter A–M skipping I. 5912E21686 → May 2012.
 * - Goodman, Amana, Daikin: 10 digits starting `YYMM`. 1203123456 → March 2012.
 * - Carrier, Bryant, Payne: `WWYY` then a plant letter. 4508E12345 → week 45, 2008.
 * - Trane, American Standard (2010 on): starts `YYWW`. 12341ABCDE → week 34, 2012.
 */
export function decodeSerial(
  manufacturer: string,
  serial: string,
  now: Date = new Date(),
): DecodedSerial | null {
  const brand = brandOf(manufacturer);
  const s = normalizeIdentifier(serial).replace(/[\s-]/g, '');
  const valid = (d: DecodedSerial) =>
    d.year >= 1980 &&
    d.year <= now.getFullYear() &&
    (d.month === undefined || (d.month >= 1 && d.month <= 12)) &&
    (d.week === undefined || (d.week >= 1 && d.week <= 53))
      ? d
      : null;

  if (/lennox|armstrong|ducane|aire ?ease/.test(brand)) {
    const match = /^\d{2}(\d{2})([A-HJ-M])\d+$/.exec(s);
    if (!match) return null;
    return valid({
      year: fullYear(Number(match[1]), now),
      month: LENNOX_MONTHS.indexOf(match[2] ?? '') + 1,
    });
  }

  if (/goodman|amana|daikin/.test(brand)) {
    const match = /^(\d{2})(\d{2})\d{6}$/.exec(s);
    if (!match) return null;
    return valid({ year: fullYear(Number(match[1]), now), month: Number(match[2]) });
  }

  if (/carrier|bryant|payne/.test(brand)) {
    const match = /^(\d{2})(\d{2})[A-Z]\d{5}$/.exec(s);
    if (!match) return null;
    return valid({ year: fullYear(Number(match[2]), now), week: Number(match[1]) });
  }

  if (/trane|american standard/.test(brand)) {
    const match = /^(\d{2})(\d{2})\d[A-Z0-9]{4,}$/.exec(s);
    if (!match) return null;
    const year = fullYear(Number(match[1]), now);
    // Before 2010 Trane used a different scheme that this pattern would misread.
    if (year < 2010) return null;
    return valid({ year, week: Number(match[2]) });
  }

  return null;
}

/**
 * The decoded date as the `YYYY-MM` the record stores. A week number is
 * turned into the month it falls in, which is all the precision a
 * technician or a warranty lookup needs.
 */
export function decodedToMonth(decoded: DecodedSerial): string {
  let month = decoded.month;
  if (month === undefined && decoded.week !== undefined) {
    const day = new Date(Date.UTC(decoded.year, 0, 1 + (decoded.week - 1) * 7));
    month = day.getUTCMonth() + 1;
  }
  return month === undefined
    ? String(decoded.year)
    : `${decoded.year}-${String(month).padStart(2, '0')}`;
}

/** Whole years since `YYYY-MM` (or `YYYY`), for "12 años" in the list. */
export function ageInYears(manufactured: string, now: Date = new Date()): number | null {
  const match = /^(\d{4})(?:-(\d{2}))?$/.exec(manufactured);
  if (!match) return null;
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : 1;
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month) age -= 1;
  return Math.max(0, age);
}

/**
 * The memo as comma-separated parts: "Attic, right side". Shortcuts are parts,
 * and anything the technician typed stays as its own part.
 */
function memoParts(memo: string): string[] {
  return memo
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function sameWords(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** Whether a shortcut is already in the memo, so its chip can show as on. */
export function memoHasShortcut(memo: string, shortcut: string): boolean {
  return memoParts(memo).some((part) => sameWords(part, shortcut));
}

/**
 * Tapping a shortcut adds it, and tapping it again takes it back out. A
 * mistaken tap is undone with the same thumb, and repeated taps can never pile
 * up "Roof roof roof".
 */
export function toggleMemoShortcut(memo: string, shortcut: string): string {
  const parts = memoParts(memo);
  const without = parts.filter((part) => !sameWords(part, shortcut));
  if (without.length !== parts.length) return without.join(', ');
  return [...parts, parts.length === 0 ? shortcut : shortcut.toLowerCase()].join(', ');
}
