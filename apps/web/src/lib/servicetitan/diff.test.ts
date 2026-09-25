import { describe, expect, it } from 'vitest';
import { createEquipment } from '../equipment';
import {
  composeMemo,
  diffEquipment,
  mergeMemo,
  suggestMatch,
  toServiceTitanFields,
} from './diff';
import type { InstalledEquipment } from './types';

const furnace: InstalledEquipment = {
  id: 11,
  name: '2nd floor furnace',
  serialNumber: '5912E21686',
  model: 'EL296UH070XV36B - 02',
  manufacturer: 'Lennox',
  memo: '3rd floor attic walk in',
  installedOn: '2012-05-16',
};
const coil: InstalledEquipment = {
  id: 12,
  name: '2nd floor evap coil',
  serialNumber: '6012008677',
  model: 'CH33 - 368 - 2F-3',
  manufacturer: 'Lennox',
  memo: '',
  installedOn: null,
};

describe('composeMemo', () => {
  it('adds the manufacture date after the location', () => {
    expect(composeMemo('Attic, right side', '2012-05')).toBe('Attic, right side · Mfd 05/2012');
    expect(composeMemo('', '2012')).toBe('Mfd 2012');
    expect(composeMemo('Attic', '')).toBe('Attic');
    expect(composeMemo('  ', 'not a date')).toBe('');
  });
});

describe('toServiceTitanFields', () => {
  it('maps a captured unit onto the ServiceTitan fields', () => {
    const unit = {
      ...createEquipment('x'),
      floor: '2nd-floor' as const,
      type: 'furnace' as const,
      manufacturer: ' Lennox ',
      model: 'el296uh070xv36b-02',
      serial: '5912e21686',
      manufactured: '2012-05',
      memo: 'Attic',
    };
    expect(toServiceTitanFields(unit)).toEqual({
      name: '2nd floor furnace',
      serialNumber: '5912E21686',
      model: 'EL296UH070XV36B-02',
      manufacturer: 'Lennox',
      memo: 'Attic · Mfd 05/2012',
    });
  });
});

describe('diffEquipment', () => {
  it('lists every filled field for a new record', () => {
    const changes = diffEquipment(null, {
      name: 'Downstairs condenser',
      serialNumber: '5822H05247',
      model: '',
      manufacturer: 'Lennox',
      memo: '',
    });
    expect(changes.map((c) => c.field)).toEqual(['name', 'serialNumber', 'manufacturer']);
    expect(changes[0]).toEqual({ field: 'name', from: '', to: 'Downstairs condenser' });
  });

  it('only lists what actually differs', () => {
    const changes = diffEquipment(furnace, {
      name: '2nd Floor Furnace',
      serialNumber: '5912e21686',
      model: 'EL296UH070XV36B-02',
      manufacturer: 'Lennox',
      memo: 'Attic · Mfd 05/2012',
    });
    // Spacing inside the stored model counts as a real difference to fix.
    expect(changes).toEqual([
      { field: 'model', from: 'EL296UH070XV36B - 02', to: 'EL296UH070XV36B-02' },
      {
        field: 'memo',
        from: '3rd floor attic walk in',
        to: '3rd floor attic walk in · Mfd 05/2012',
      },
    ]);
  });

  it('never blanks out a value the office already has', () => {
    const changes = diffEquipment(furnace, {
      name: '',
      serialNumber: '',
      model: '',
      manufacturer: '',
      memo: '',
    });
    expect(changes).toEqual([]);
  });
});

describe('suggestMatch', () => {
  it('matches on serial number first', () => {
    const next = {
      name: 'Something else',
      serialNumber: '6012008677',
      model: '',
      manufacturer: '',
      memo: '',
    };
    expect(suggestMatch(next, [furnace, coil])?.id).toBe(12);
  });

  it('falls back to the name', () => {
    const next = {
      name: '2nd floor furnace',
      serialNumber: 'NEW123',
      model: '',
      manufacturer: '',
      memo: '',
    };
    expect(suggestMatch(next, [furnace, coil])?.id).toBe(11);
  });

  it('suggests a new record when nothing matches', () => {
    const next = {
      name: 'Attic air handler',
      serialNumber: 'X1',
      model: '',
      manufacturer: '',
      memo: '',
    };
    expect(suggestMatch(next, [furnace, coil])).toBeNull();
  });
});

describe('mergeMemo', () => {
  it('keeps the office note and adds only what is new', () => {
    expect(mergeMemo('3rd floor attic walk in', 'Attic · Mfd 05/2012')).toBe(
      '3rd floor attic walk in · Mfd 05/2012',
    );
    expect(mergeMemo('Right side', 'Attic, right side · Mfd 2020')).toBe(
      'Right side · Attic · Mfd 2020',
    );
  });

  it('uses the captured memo when there is none yet', () => {
    expect(mergeMemo('', 'Attic · Mfd 05/2012')).toBe('Attic · Mfd 05/2012');
  });

  it('changes nothing when everything is already there', () => {
    expect(mergeMemo('Crawlspace back · Mfd 08/2022', 'Crawlspace · Mfd 08/2022')).toBe(
      'Crawlspace back · Mfd 08/2022',
    );
  });
});
