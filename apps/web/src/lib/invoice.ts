import { CATALOG_BY_ID, type WorkAction } from './catalog';

/**
 * Deterministic invoice composer.
 *
 * Everything a customer reads on the bill is assembled here from typed data and
 * fixed templates. No language model touches this path — a hallucinated part
 * number or price on a customer invoice is a legal problem, not a bug, so the
 * boundary between deterministic and generative sits here on purpose.
 *
 * A later phase adds an optional polish pass that may only rephrase the prose
 * this function already produced; it can never add, drop, or alter a line item.
 * See docs/adr/0002-deterministic-invoice.md.
 */

export type CallType = 'no-cooling' | 'no-heat' | 'maintenance' | 'install';

export interface LineItem {
  itemId: string;
  quantity: number;
  action: WorkAction;
}

export interface InvoiceDraft {
  callType: CallType;
  lines: readonly LineItem[];
  /** Equipment the work was performed on, e.g. "Goodman GSX140361". */
  unit?: string;
}

const OPENING: Record<CallType, string> = {
  'no-cooling':
    'Responded to a no-cooling service call and performed a full diagnostic on the system.',
  'no-heat':
    'Responded to a no-heat service call and performed a full diagnostic on the system.',
  maintenance: 'Performed scheduled preventative maintenance and a full system inspection.',
  install: 'Performed equipment installation and start-up.',
};

const CLOSING: Record<CallType, string> = {
  'no-cooling':
    'Verified system operation after repair. Measured supply and return temperatures and confirmed refrigerant charge within manufacturer specification. System was cooling properly at time of departure.',
  'no-heat':
    'Verified system operation after repair. Confirmed ignition sequence, flame signal, and temperature rise within manufacturer specification. System was heating properly at time of departure.',
  maintenance:
    'Confirmed all safety controls operational and system performance within manufacturer specification at time of departure.',
  install:
    'Completed start-up, verified charge and airflow, and reviewed system operation with the customer.',
};

/** Past-tense verb phrases, grouped so the invoice reads as prose, not a list. */
const ACTION_VERB: Record<WorkAction, string> = {
  replaced: 'Replaced',
  repaired: 'Repaired',
  cleaned: 'Cleaned and serviced',
  tested: 'Tested and verified',
};

const ACTION_ORDER: readonly WorkAction[] = ['replaced', 'repaired', 'cleaned', 'tested'];

function pluralize(phrase: string, quantity: number): string {
  if (quantity === 1) return phrase;
  // The catalog uses simple noun phrases, so the regular rule is enough here.
  return /(s|sh|ch|x|z)$/.test(phrase) ? `${phrase}es` : `${phrase}s`;
}

function joinList(parts: readonly string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0] ?? '';
  const head = parts.slice(0, -1).join(', ');
  return `${head} and ${parts[parts.length - 1]}`;
}

/** One sentence per action group: "Replaced 1 dual run capacitor and 1 contactor." */
function sentenceFor(action: WorkAction, lines: readonly LineItem[]): string | null {
  const phrases = lines.flatMap((line) => {
    const item = CATALOG_BY_ID.get(line.itemId);
    if (!item || line.quantity < 1) return [];
    return [`${line.quantity} ${pluralize(item.invoicePhrase, line.quantity)}`];
  });

  if (phrases.length === 0) return null;
  return `${ACTION_VERB[action]} ${joinList(phrases)}.`;
}

export function composeInvoiceDescription(draft: InvoiceDraft): string {
  const paragraphs: string[] = [];

  const opening = draft.unit
    ? `${OPENING[draft.callType]} Work performed on ${draft.unit}.`
    : OPENING[draft.callType];
  paragraphs.push(opening);

  const body = ACTION_ORDER.map((action) =>
    sentenceFor(
      action,
      draft.lines.filter((line) => line.action === action),
    ),
  ).filter((sentence): sentence is string => sentence !== null);

  if (body.length > 0) paragraphs.push(body.join(' '));

  paragraphs.push(CLOSING[draft.callType]);

  return paragraphs.join('\n\n');
}

/** Total distinct parts on the ticket, used for the header count. */
export function lineCount(lines: readonly LineItem[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}
