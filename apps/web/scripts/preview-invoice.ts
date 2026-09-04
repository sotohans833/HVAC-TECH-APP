/**
 * Prints sample invoice descriptions to the terminal.
 *
 * The output of the composer is customer-facing copy, so it has to be read as a
 * customer would read it — not asserted on in a test and never looked at. Run
 * this after touching the catalog or the composer:
 *
 *   pnpm --filter @manifold/web preview:invoice
 */
import { composeInvoiceDescription, type InvoiceDraft } from '../src/lib/invoice';

const SAMPLES: { title: string; draft: InvoiceDraft }[] = [
  {
    title: 'Maintenance — nothing replaced, everything within spec',
    draft: {
      callType: 'maintenance',
      maintenanceScope: 'cooling',
      unit: 'Carrier 24ABC636',
      lines: [],
    },
  },
  {
    title: 'Diagnostic — no fault found',
    draft: { callType: 'no-cooling', lines: [] },
  },
  {
    title: 'Wear part — customer asks why it failed on a newer unit',
    draft: {
      callType: 'no-cooling',
      lines: [
        { itemId: 'contactor', quantity: 1, action: 'replaced', causeId: 'burned-contacts' },
      ],
    },
  },
  {
    title: 'Compressor failure at 14 months on a system that never got maintenance',
    draft: {
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
        { itemId: 'refrigerant-charge', quantity: 8, action: 'added' },
      ],
    },
  },
  {
    title: 'Heating maintenance with a routine flame sensor cleaning',
    draft: {
      callType: 'maintenance',
      maintenanceScope: 'heating',
      lines: [{ itemId: 'flame-sensor', quantity: 1, action: 'cleaned', causeId: 'oxidized' }],
    },
  },
];

for (const { title, draft } of SAMPLES) {
  console.log(`\n${'═'.repeat(72)}\n${title}\n${'═'.repeat(72)}\n`);
  console.log(composeInvoiceDescription(draft));
}
