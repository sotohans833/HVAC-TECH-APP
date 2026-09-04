# 0005 — Why a part failed does not belong on the invoice

**Status:** accepted · **Date:** 2026-09-04
**Amends:** [0004](0004-explaining-the-why.md)

## Context

ADR 0004 put a `WHY THIS HAPPENED` section on the invoice: the plain-language
reason a part failed, plus a note on whether its replacement said anything about
the quality of the equipment.

Read back on a real ticket, it was too much. A compressor replacement produced
four paragraphs of explanation ahead of two lines of actual work. The line items
— what the customer is paying for — got buried under prose most people will not
read on a bill.

The underlying need was real and is unchanged: customers do ask why a part
failed, and answering well matters. But that is a conversation, and it happens
with the customers who ask, not with every customer on every invoice.

## Decision

The composer no longer emits the `WHY THIS HAPPENED` section, the standing
service notes, or the maintenance recommendation.

It keeps `FINDINGS`, which states what was found in one line per item. That is
standard invoice content and it is short.

The `explanation`, `serviceNote` and `preventable` fields stay in the catalog.
They are not dead weight: they are the content for a customer-facing explainer —
a screen a technician can pull up and show, or send as a follow-up, when someone
asks why their fourteen-month-old system needed a compressor. That view is not
built yet.

## Consequences

- Invoices are shorter and the work performed is the first thing a customer
  reads after the findings.
- Nothing is lost. The explanations are still written, still typed, still
  reviewed by the same `preview:invoice` script when they are surfaced again.
- The catalog carries fields the composer does not read. That is deliberate and
  recorded here so it does not look like an oversight later.
- ADR 0004's other two decisions stand: standing procedure lists for maintenance
  and diagnostic calls, and the `serviceClass` taxonomy.
