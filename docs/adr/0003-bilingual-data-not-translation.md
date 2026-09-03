# 0003 — Bilingual data, not a translated UI

**Status:** accepted · **Date:** 2026-09-03

## Context

The standard approach is to write the app in English and translate the interface.
That does not describe this product. The technician thinks and works in Spanish;
the homeowner or the office reads English. Those are different languages at
different ends of the same action.

## Decision

Domain records carry both languages as data — a catalog item has
`label: { en, es }` — while `invoicePhrase` exists only in English, because it is
customer-facing output rather than interface text. next-intl handles interface
strings; it does not handle domain vocabulary.

Spanish is the default locale.

## Consequences

- Input language and output language are decoupled by construction, which is the
  product rather than a feature of it.
- A part cannot be added with only one language filled in; the type requires both.
- Adding a third locale means extending the record type, which surfaces every
  place that needs a translation as a compile error instead of a runtime blank.
