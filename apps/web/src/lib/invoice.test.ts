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

describe('reporting what was found', () => {
  it('states the finding without explaining the failure', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      lines: [
        { itemId: 'contactor', quantity: 1, action: 'replaced', causeId: 'burned-contacts' },
      ],
    });

    expect(text).toContain('FINDINGS');
    expect(text).toContain('Found the contactor with severely pitted and burned contacts.');
    expect(text).toContain('Replaced 1 condenser contactor.');
  });

  // Why a part failed is a conversation, not a bill. The catalog still carries
  // the explanations for a future customer-facing view; the invoice does not.
  it('keeps the customer explanations off the invoice entirely', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      unit: 'Goodman GSX140361',
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

    expect(text).not.toContain('WHY THIS HAPPENED');
    expect(text).not.toContain('preventable with routine maintenance');
    expect(text).not.toContain('rather than a defect in the unit');
    expect(text).not.toContain('require a new drier any time');
  });

  it('lists several findings instead of running them into one sentence', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
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
      ],
    });
    expect(text).toContain('• A failed compressor operating against');
    expect(text).toContain('• A condenser coil heavily restricted with dirt and debris');
  });

  it('says nothing about findings when the technician did not pick a cause', () => {
    const text = composeInvoiceDescription({
      callType: 'no-cooling',
      lines: [{ itemId: 'contactor', quantity: 1, action: 'replaced' }],
    });
    expect(text).not.toContain('FINDINGS');
    expect(text).toContain('Replaced 1 condenser contactor.');
  });

  it('never repeats the same finding twice', () => {
    const text = composeInvoiceDescription({
      callType: 'maintenance',
      lines: [
        {
          itemId: 'condenser-coil',
          quantity: 1,
          action: 'cleaned',
          causeId: 'restricted-dirt',
        },
        {
          itemId: 'condenser-fan-motor',
          quantity: 1,
          action: 'replaced',
          causeId: 'restricted-airflow',
        },
      ],
    });
    const occurrences = text.split('heavily restricted with dirt and debris').length - 1;
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
