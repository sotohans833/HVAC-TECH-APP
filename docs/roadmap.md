# Roadmap

Phase status as of 2026-09-03.

| Phase | Scope                                        | Status      |
| ----- | -------------------------------------------- | ----------- |
| 0     | Monorepo, tokens, design system, i18n, CI    | done        |
| 1     | Invoice builder — offline, deterministic     | in progress |
| 2     | FastAPI backend, auth, sync, generated types | not started |
| 3     | Agentic diagnostic assistant                 | not started |
| 4     | Tool/material lists, error codes by brand    | not started |
| 5     | Dashboard, PWA, accessibility audit, k8s     | not started |

## Phase 0 — delivered

- pnpm workspace: `apps/web`, `packages/ui`
- TypeScript strict everywhere, including `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`
- Design tokens with light and dark themes, no flash on load
- 23 HVAC part icons drawn as schematic symbols, plus a UI icon set
- Components: ActionTile, Button, Stepper, Panel, Badge, SegmentedControl
- Storybook with the a11y addon, themed to match the app
- next-intl routing with Spanish as the default locale
- GitHub Actions: format, typecheck, unit tests, app build, Storybook build

## Phase 1 — in progress

Done: bilingual catalog of 22 parts with failure causes, deterministic composer
with 21 unit tests, preventative
maintenance and diagnostic procedure lists, tile grid, ticket panel with
per-line action and cause selection, quantity steppers, copy to clipboard.

Next: measured readings on the invoice (superheat, subcooling, temperature
split, capacitor microfarads, amp draws), IndexedDB persistence, a shareable
invoice view, and photo attachments.

Deferred: a customer-facing explainer view built on the `explanation` and
`serviceNote` content already in the catalog. Those explanations were on the
invoice and were pulled back off it — see ADR 0005 — because they belong in a
conversation with the customers who ask, not on every bill.
