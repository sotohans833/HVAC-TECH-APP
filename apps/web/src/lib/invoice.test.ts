import { describe, expect, it } from 'vitest';
import { composeInvoiceDescription, lineCount } from './invoice';

describe('composeInvoiceDescription', () => {
  it('opens and closes with copy matched to the call type', () => {
    const text = composeInvoiceDescription({ callType: 'no-heat', lines: [] });
    expect(text).toContain('no-heat service call');
    expect(text).toContain('ignition sequence');
  });

  it('names the unit when one is given', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      lines: [],
      unit: 'Goodman GSX140361',
    });
    expect(text).toContain('Work performed on Goodman GSX140361.');
  });

  it('groups lines by action into one sentence each', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      lines: [
        { itemId: 'run-capacitor', quantity: 1, action: 'replaced' },
        { itemId: 'contactor', quantity: 1, action: 'replaced' },
        { itemId: 'condenser-coil', quantity: 1, action: 'cleaned' },
      ],
    });
    expect(text).toContain('Replaced 1 dual run capacitor and 1 condenser contactor.');
    expect(text).toContain('Cleaned and serviced 1 condenser coil.');
  });

  it('pluralizes quantities above one', () => {
    const text = composeInvoiceDescription({
      callType: 'maintenance',
      lines: [{ itemId: 'air-filter', quantity: 3, action: 'replaced' }],
    });
    expect(text).toContain('Replaced 3 return air filters.');
  });

  it('ignores unknown ids and non-positive quantities rather than emitting junk', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      lines: [
        { itemId: 'does-not-exist', quantity: 1, action: 'replaced' },
        { itemId: 'contactor', quantity: 0, action: 'replaced' },
      ],
    });
    expect(text).not.toContain('Replaced');
  });

  it('never emits a price or a part number it was not given', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      lines: [{ itemId: 'run-capacitor', quantity: 1, action: 'replaced' }],
    });
    expect(text).not.toMatch(/\$\d/);
  });
});

describe('lineCount', () => {
  it('sums quantities rather than counting rows', () => {
    expect(
      lineCount([
        { itemId: 'air-filter', quantity: 3, action: 'replaced' },
        { itemId: 'contactor', quantity: 1, action: 'replaced' },
      ]),
    ).toBe(4);
  });
});
