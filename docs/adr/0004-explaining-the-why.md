# 0004 — The invoice explains why the part failed

**Status:** accepted · **Date:** 2026-09-04

## Context

Two gaps showed up as soon as a working technician used the builder.

First, the most common ticket in the trade produced almost nothing. A full
preventative maintenance visit where everything checked out generated two thin
sentences, which makes a real hour of work look like nothing happened. The same
was true of a diagnostic call that found no fault — a legitimate and frequent
outcome that still has to be billed and justified.

Second, and more important: customers do not only ask _what_ was replaced, they
ask _why_. The question that comes up constantly is some version of "why did
that part fail if my unit is almost new?" Answering it well is the difference
between a customer who feels informed and one who suspects they were sold a part
they did not need. A technician answers it verbally at every call and then writes
none of it on the invoice, where the person paying the bill would actually read
it.

## Decision

Three additions to the domain model, all as data rather than prose generation:

1. **Every part carries its common failure causes.** A cause has a customer-facing
   `finding` ("the contactor with severely pitted and burned contacts") and an
   `explanation` written for a homeowner. The technician picks the cause with one
   tap; the invoice gains a `FINDINGS` and a `WHY THIS HAPPENED` section.

2. **Every part carries a `serviceClass`** — `wear`, `consumable`, or `component`
   — and wear and consumable parts carry a `serviceNote` stating plainly that
   replacement is expected and says nothing about the quality of the equipment.
   Contactors and capacitors are the ones customers question most, so they say so
   directly.

3. **Standing procedure lists** in `lib/procedures.ts` for preventative
   maintenance (by scope: cooling, heating, or full system) and for diagnostic
   checks. Maintenance always lists its procedure; a diagnostic call lists its
   checks when no part was replaced, where that list is the entire justification
   for the visit.

Causes marked `preventable` add a single closing note recommending maintenance —
once per invoice, never repeated per line.

## Consequences

- A maintenance visit with nothing replaced now produces a complete, itemized
  description. A no-fault-found diagnostic explains what was ruled out.
- The reassurance is honest rather than generic: a wear part says it is a wear
  part, and an early component failure names the operating condition that caused
  it. A compressor that failed at fourteen months because the condenser coil was
  never cleaned reads as exactly that, which is a conversation the technician was
  already having out loud.
- The cause is deliberately left unset when a part is added. A guessed default
  would end up on a customer invoice unread, and being wrong about why a part
  failed is worse than saying nothing.
- Writing a cause set for each new part is real work. Accepted — this content is
  the product, and it is the part a competitor cannot copy from a spec sheet.
- Every explanation stays inside the deterministic path of ADR 0002. No model
  writes any of it.
