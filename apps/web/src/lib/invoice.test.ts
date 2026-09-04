import { describe, expect, it } from 'vitest';
import { composeInvoiceDescription, lineCount } from './invoice';
import { CATALOG } from './catalog';

describe('composeInvoiceDescription', () => {
  it('opens and closes with copy matched to the call type', () => {
    const text = composeInvoiceDescription({ callType: 'no-heat', lines: [] });
    expect(text).toContain('no-heat service call');
  });

  it('names the unit when one is given', () => {
    const text = composeInvoiceDescription({
      callType: 'install',
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

  it('pluralizes the unit, not the substance, in "x of y" phrases', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      lines: [{ itemId: 'refrigerant-charge', quantity: 3, action: 'added' }],
    });
    expect(text).toContain('Added 3 pounds of refrigerant.');
    expect(text).not.toContain('refrigerants');
  });

  it('ignores unknown ids and non-positive quantities rather than emitting junk', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      lines: [
        { itemId: 'does-not-exist', quantity: 1, action: 'replaced' },
        { itemId: 'contactor', quantity: 0, action: 'replaced' },
      ],
    });
    expect(text).not.toContain('WORK PERFORMED');
  });

  it('never emits a price it was not given', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      lines: [{ itemId: 'run-capacitor', quantity: 1, action: 'replaced' }],
    });
    expect(text).not.toMatch(/\$\d/);
  });
});

describe('maintenance with nothing replaced', () => {
  it('still lists the full procedure that was performed', () => {
    const text = composeInvoiceDescription({
      callType: 'maintenance',
      lines: [],
      maintenanceScope: 'cooling',
    });

    expect(text).toContain('INSPECTION AND SERVICE PERFORMED');
    expect(text).toContain('Washed and cleaned the condenser coil');
    expect(text).toContain('verified superheat and subcooling');
    expect(text).toContain('Flushed and treated the condensate drain line');
    expect(text).toContain('no repairs were required');
  });

  it('covers the heating section when the scope says so', () => {
    const heating = composeInvoiceDescription({
      callType: 'maintenance',
      lines: [],
      maintenanceScope: 'heating',
    });
    expect(heating).toContain('Inspected the heat exchanger');
    expect(heating).not.toContain('Washed and cleaned the condenser coil');

    const full = composeInvoiceDescription({
      callType: 'maintenance',
      lines: [],
      maintenanceScope: 'full',
    });
    expect(full).toContain('Inspected the heat exchanger');
    expect(full).toContain('Washed and cleaned the condenser coil');
  });

  it('produces a substantial description, not two thin sentences', () => {
    const text = composeInvoiceDescription({
      callType: 'maintenance',
      lines: [],
      maintenanceScope: 'full',
    });
    expect(text.length).toBeGreaterThan(1200);
  });
});

describe('diagnostic call with no fault found', () => {
  it('lists what was ruled out and says nothing was found', () => {
    const text = composeInvoiceDescription({ callType: 'no-cooling', lines: [] });

    expect(text).toContain('INSPECTION AND SERVICE PERFORMED');
    expect(text).toContain('Tested the run capacitor against its nameplate rating');
    expect(text).toContain('No failure was found at the time of this visit.');
    expect(text).toContain('Intermittent conditions');
  });

  it('treats a labor line marked no-fault-found the same way', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      lines: [{ itemId: 'labor', quantity: 1, action: 'performed', causeId: 'no-fault-found' }],
    });
    expect(text).toContain('No failure was found');
    expect(text).toContain('Performed 1 hour of diagnostic labor.');
  });

  it('drops the checklist once an actual repair is on the ticket', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      lines: [
        { itemId: 'contactor', quantity: 1, action: 'replaced', causeId: 'burned-contacts' },
      ],
    });
    expect(text).not.toContain('INSPECTION AND SERVICE PERFORMED');
    expect(text).not.toContain('No failure was found');
  });
});

describe('explaining why the part failed', () => {
  it('reports the finding and the reason behind it', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      lines: [
        { itemId: 'contactor', quantity: 1, action: 'replaced', causeId: 'burned-contacts' },
      ],
    });

    expect(text).toContain('FINDINGS');
    expect(text).toContain('Found the contactor with severely pitted and burned contacts.');
    expect(text).toContain('WHY THIS HAPPENED');
    expect(text).toContain('over thousands of cycles that arcing pits and burns');
  });

  it('reassures the customer that a wear part is not a sign of bad equipment', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      lines: [
        { itemId: 'contactor', quantity: 1, action: 'replaced', causeId: 'burned-contacts' },
      ],
    });
    expect(text).toContain('does not reflect the quality or age of the system');
  });

  // The case that started all of this: a fourteen-month-old unit whose
  // compressor failed because the customer declined maintenance and the
  // condenser coil was completely plugged.
  it('connects an early compressor failure to the skipped maintenance that caused it', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      unit: 'Goodman GSX140361',
      maintenanceScope: 'cooling',
      lines: [
        {
          itemId: 'compressor',
          quantity: 1,
          action: 'replaced',
          causeId: 'overheated-restriction',
        },
        {
          itemId: 'condenser-coil',
          quantity: 1,
          action: 'cleaned',
          causeId: 'restricted-dirt',
        },
        { itemId: 'filter-drier', quantity: 1, action: 'replaced', causeId: 'system-opened' },
      ],
    });

    expect(text).toContain('severely restricted condenser coil');
    expect(text).toContain('most common cause of early compressor failure');
    expect(text).toContain('rather than a defect in the unit');
    expect(text).toContain('preventable with routine maintenance');
    // The drier is standard practice, and the invoice should say so rather than
    // leaving the customer to wonder why they were billed for an extra part.
    expect(text).toContain('require a new drier any time the sealed system is opened');
  });

  it('does not nag about maintenance when nothing found was preventable', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      lines: [{ itemId: 'transformer', quantity: 1, action: 'replaced', causeId: 'surge' }],
    });
    expect(text).not.toContain('preventable with routine maintenance');
  });

  it('says nothing about causes when the technician did not pick one', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      lines: [{ itemId: 'contactor', quantity: 1, action: 'replaced' }],
    });
    expect(text).not.toContain('FINDINGS');
    expect(text).toContain('Replaced 1 condenser contactor.');
  });

  it('never repeats the same explanation twice', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      lines: [
        {
          itemId: 'condenser-coil',
          quantity: 1,
          action: 'cleaned',
          causeId: 'restricted-dirt',
        },
        { itemId: 'evaporator-coil', quantity: 1, action: 'cleaned', causeId: 'dirty' },
      ],
    });
    const occurrences = text.split('preventable with routine maintenance').length - 1;
    expect(occurrences).toBe(1);
  });
});

describe('catalog integrity', () => {
  it('gives every part at least one cause and a default action', () => {
    for (const item of CATALOG) {
      expect(item.causes.length, `${item.id} has no causes`).toBeGreaterThan(0);
      expect(item.actions.length, `${item.id} has no actions`).toBeGreaterThan(0);
    }
  });

  it('uses unique ids for parts and for their causes', () => {
    const ids = CATALOG.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const item of CATALOG) {
      const causeIds = item.causes.map((cause) => cause.id);
      expect(new Set(causeIds).size, `${item.id} has duplicate cause ids`).toBe(
        causeIds.length,
      );
    }
  });

  it('writes every finding so it reads correctly after "Found "', () => {
    for (const item of CATALOG) {
      for (const cause of item.causes) {
        if (!cause.finding) continue;
        expect(cause.finding[0], `${item.id}/${cause.id} should not be capitalized`).toBe(
          cause.finding[0]?.toLowerCase(),
        );
        expect(
          cause.finding.endsWith('.'),
          `${item.id}/${cause.id} should not end in a period`,
        ).toBe(false);
      }
    }
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
