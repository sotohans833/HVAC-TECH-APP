# 0002 — The invoice is deterministic; the model may only rephrase

**Status:** accepted · **Date:** 2026-09-03

## Context

The product's headline feature generates a customer-facing invoice description.
It is tempting to hand the whole job to a language model, since the output is
prose. A hallucinated part number, quantity, or price on a document a customer
pays against is not a bug — it is a billing dispute, and potentially a legal one.

## Decision

`lib/invoice.ts` composes the description from typed catalog data and fixed
templates. No model is in that path.

A later phase may add an optional polish pass that rephrases prose the composer
already produced. It will never be permitted to add, drop, or alter a line item,
a quantity, or a figure, and its output will be diffed against the deterministic
version before it is shown.

## Consequences

- Output is reproducible and unit-testable — see `lib/invoice.test.ts`, which
  asserts among other things that no dollar figure can appear that was not given.
- Works fully offline, which matters more than polish in a crawlspace.
- The catalog carries hand-written `invoicePhrase` strings, so adding a part is a
  small amount of copywriting. Accepted: that is the cost of never lying on a bill.
