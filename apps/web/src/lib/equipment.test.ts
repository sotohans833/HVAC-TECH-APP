import { describe, expect, it } from 'vitest';
import {
  ageInYears,
  composeEquipmentName,
  decodeSerial,
  decodedToMonth,
  normalizeIdentifier,
} from './equipment';

const NOW = new Date(2026, 8, 23);

describe('composeEquipmentName', () => {
  it('writes the name the way the office does in ServiceTitan', () => {
    expect(composeEquipmentName('2nd-floor', 'furnace')).toBe('2nd floor furnace');
    expect(composeEquipmentName('2nd-floor', 'evap-coil')).toBe('2nd floor evap coil');
    expect(composeEquipmentName('downstairs', 'condenser')).toBe('Downstairs condenser');
  });

  it('capitalizes whichever half is present', () => {
    expect(composeEquipmentName('', 'tankless-water-heater')).toBe('Tankless water heater');
    expect(composeEquipmentName('upstairs', '')).toBe('Upstairs');
    expect(composeEquipmentName('', '')).toBe('');
  });
});

describe('normalizeIdentifier', () => {
  it('trims, uppercases and collapses spaces but keeps dashes', () => {
    expect(normalizeIdentifier('  slp99uh110xv60c-02 ')).toBe('SLP99UH110XV60C-02');
    expect(normalizeIdentifier('CH33 -  368')).toBe('CH33 - 368');
  });
});

describe('decodeSerial', () => {
  // Real serials from a customer's equipment list.
  it.each([
    ['5925E10450', 2025, 5],
    ['5912E21686', 2012, 5],
    ['5822H05247', 2022, 8],
    ['1522H52662', 2022, 8],
  ])('reads Lennox %s as %i-%i', (serial, year, month) => {
    expect(decodeSerial('Lennox', serial, NOW)).toEqual({ year, month });
  });

  it('skips the letter I in the Lennox month sequence', () => {
    expect(decodeSerial('Lennox', '5912J00001', NOW)?.month).toBe(9);
    expect(decodeSerial('Lennox', '5912M00001', NOW)?.month).toBe(12);
    expect(decodeSerial('Lennox', '5912I00001', NOW)).toBeNull();
  });

  it('reads Goodman as YYMM', () => {
    expect(decodeSerial('Goodman', '1203123456', NOW)).toEqual({ year: 2012, month: 3 });
    expect(decodeSerial('Amana', '1213123456', NOW)).toBeNull();
  });

  it('reads Carrier as WWYY', () => {
    expect(decodeSerial('Carrier', '4508E12345', NOW)).toEqual({ year: 2008, week: 45 });
    expect(decodeSerial('Bryant', '0419A00001', NOW)).toEqual({ year: 2019, week: 4 });
  });

  it('reads 2010-and-later Trane as YYWW and refuses older formats', () => {
    expect(decodeSerial('Trane', '12341ABCDE', NOW)).toEqual({ year: 2012, week: 34 });
    expect(decodeSerial('Trane', '98341ABCDE', NOW)).toBeNull();
  });

  it('returns null rather than guessing for unknown brands or shapes', () => {
    expect(decodeSerial('Rinnai', 'RK. UA-141053', NOW)).toBeNull();
    expect(decodeSerial('Lennox', '6012008677', NOW)).toBeNull();
    expect(decodeSerial('', '5912E21686', NOW)).toBeNull();
  });

  it('rejects dates in the future', () => {
    expect(decodeSerial('Goodman', '2701123456', NOW)).toBeNull();
  });
});

describe('decodedToMonth', () => {
  it('formats months directly', () => {
    expect(decodedToMonth({ year: 2012, month: 5 })).toBe('2012-05');
  });

  it('turns a week into the month it falls in', () => {
    expect(decodedToMonth({ year: 2008, week: 45 })).toBe('2008-11');
    expect(decodedToMonth({ year: 2019, week: 1 })).toBe('2019-01');
  });
});

describe('ageInYears', () => {
  it('counts whole years', () => {
    expect(ageInYears('2012-05', NOW)).toBe(14);
    expect(ageInYears('2025-12', NOW)).toBe(0);
    expect(ageInYears('2012', NOW)).toBe(14);
  });

  it('returns null for anything that is not a date', () => {
    expect(ageInYears('', NOW)).toBeNull();
    expect(ageInYears('May 2012', NOW)).toBeNull();
  });
});
