import { CATALOG_BY_ID, findCause, type WorkAction } from './catalog';
import { DIAGNOSTIC_CHECKS, maintenanceTasks, type MaintenanceScope } from './procedures';

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
 *
 * The description states what was found and what was done. It deliberately does
 * not explain *why* a part failed: that conversation belongs face to face with
 * the customers who ask for it, and on a bill it buried the line items. The
 * catalog still carries those explanations for a future customer-facing view.
 * See docs/adr/0005-why-lives-outside-the-invoice.md.
 */

export type CallType = 'no-cooling' | 'no-heat' | 'maintenance' | 'install';

export interface LineItem {
  itemId: string;
  quantity: number;
  action: WorkAction;
  /** Which of the part's known failure causes applied. */
  causeId?: string;
}

export interface InvoiceDraft {
  callType: CallType;
  lines: readonly LineItem[];
  /** Equipment the work was performed on, e.g. "Goodman GSX140361". */
  unit?: string;
  /** Which side of the system a maintenance visit covered. */
  maintenanceScope?: MaintenanceScope;
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
    'Verified system operation after repair. Confirmed ignition sequence, flame signal and temperature rise within manufacturer specification. System was heating properly at time of departure.',
  maintenance:
    'Confirmed all safety controls operational and system performance within manufacturer specification at time of departure.',
  install:
    'Completed start-up, verified charge and airflow, and reviewed system operation with the customer.',
};

const ACTION_VERB: Record<WorkAction, string> = {
  replaced: 'Replaced',
  repaired: 'Repaired',
  cleaned: 'Cleaned and serviced',
  added: 'Added',
  performed: 'Performed',
  tested: 'Tested and verified',
};

const ACTION_ORDER: readonly WorkAction[] = [
  'replaced',
  'repaired',
  'cleaned',
  'added',
  'performed',
  'tested',
];

const HEADING = {
  tasks: 'INSPECTION AND SERVICE PERFORMED',
  findings: 'FINDINGS',
  work: 'WORK PERFORMED',
  status: 'SYSTEM STATUS AT DEPARTURE',
} as const;

const NO_FAULT_FOUND =
  'The system was tested throughout and found operating within manufacturer specification. No failure was found at the time of this visit. Intermittent conditions do not always reproduce during a single visit — please contact us if the problem returns, and note the time of day and the outdoor temperature when it happens.';

const ALL_WITHIN_SPEC =
  'All readings were within manufacturer specification at the time of this visit and no repairs were required. All safety controls were confirmed operational before departure.';

/**
 * Pluralizes a catalog phrase. Phrases built as "<unit> of <substance>" pluralize
 * on the unit — "2 pounds of refrigerant", never "2 pound of refrigerants".
 */
function pluralize(phrase: string, quantity: number): string {
  if (quantity === 1) return phrase;

  const ofIndex = phrase.indexOf(' of ');
  if (ofIndex > 0) {
    return `${addS(phrase.slice(0, ofIndex))}${phrase.slice(ofIndex)}`;
  }
  return addS(phrase);
}

function addS(word: string): string {
  return /(s|sh|ch|x|z)$/.test(word) ? `${word}es` : `${word}s`;
}

function joinList(parts: readonly string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0] ?? '';
  const head = parts.slice(0, -1).join(', ');
  return `${head} and ${parts[parts.length - 1]}`;
}

function bulleted(items: readonly string[]): string {
  return items.map((item) => `• ${item}`).join('\n');
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Drops repeats while keeping first-seen order. */
function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function validLines(lines: readonly LineItem[]): LineItem[] {
  return lines.filter((line) => line.quantity > 0 && CATALOG_BY_ID.has(line.itemId));
}

/** One sentence per action group: "Replaced 1 dual run capacitor and 1 contactor." */
function workSentence(action: WorkAction, lines: readonly LineItem[]): string | null {
  const phrases = lines.flatMap((line) => {
    const item = CATALOG_BY_ID.get(line.itemId);
    if (!item) return [];
    return [`${line.quantity} ${pluralize(item.invoicePhrase, line.quantity)}`];
  });

  if (phrases.length === 0) return null;
  return `${ACTION_VERB[action]} ${joinList(phrases)}.`;
}

function section(heading: string, body: string): string {
  return `${heading}\n${body}`;
}

export function composeInvoiceDescription(draft: InvoiceDraft): string {
  const lines = validLines(draft.lines);
  const blocks: string[] = [];

  // ---- opening ----
  blocks.push(
    draft.unit
      ? `${OPENING[draft.callType]} Work performed on ${draft.unit}.`
      : OPENING[draft.callType],
  );

  // Narrowed rather than a boolean so `DIAGNOSTIC_CHECKS` can be indexed safely.
  const diagnosticType =
    draft.callType === 'no-cooling' || draft.callType === 'no-heat' ? draft.callType : null;
  const noFaultFound =
    diagnosticType !== null &&
    (lines.length === 0 || lines.every((line) => line.causeId === 'no-fault-found'));

  // ---- what was inspected ----
  // A maintenance visit always lists its procedure, because "nothing was broken"
  // is the most common outcome and the least self-evident on a bill. A
  // diagnostic call lists its checks only when nothing was replaced, where the
  // list is the entire justification for the visit.
  if (draft.callType === 'maintenance') {
    blocks.push(
      section(HEADING.tasks, bulleted(maintenanceTasks(draft.maintenanceScope ?? 'cooling'))),
    );
  } else if (diagnosticType !== null && noFaultFound) {
    blocks.push(section(HEADING.tasks, bulleted(DIAGNOSTIC_CHECKS[diagnosticType])));
  }

  // ---- findings ----
  const findings = unique(
    lines.flatMap((line) => {
      const finding = findCause(line.itemId, line.causeId)?.finding;
      return finding ? [finding] : [];
    }),
  );

  // One finding reads as a sentence. Several read as a list — each one is a
  // clause with its own commas, so joining them produced a run-on nobody would
  // read on a bill.
  if (findings.length === 1) {
    blocks.push(section(HEADING.findings, `Found ${findings[0]}.`));
  } else if (findings.length > 1) {
    blocks.push(section(HEADING.findings, bulleted(findings.map(capitalize))));
  }

  // ---- work performed ----
  const work = ACTION_ORDER.map((action) =>
    workSentence(
      action,
      lines.filter((line) => line.action === action),
    ),
  ).filter((sentence): sentence is string => sentence !== null);

  if (work.length > 0) {
    blocks.push(section(HEADING.work, work.join(' ')));
  }

  // ---- closing ----
  const status: string[] = [];
  if (noFaultFound) {
    status.push(NO_FAULT_FOUND);
  } else {
    if (draft.callType === 'maintenance' && lines.length === 0) {
      status.push(ALL_WITHIN_SPEC);
    } else {
      status.push(CLOSING[draft.callType]);
    }
  }
  blocks.push(section(HEADING.status, status.join(' ')));

  return blocks.join('\n\n');
}

/** Total pieces on the ticket, used for the header count. */
export function lineCount(lines: readonly LineItem[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}
