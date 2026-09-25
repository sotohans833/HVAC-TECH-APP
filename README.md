# Manifold

A bilingual (Spanish / English) field app for HVAC and refrigeration technicians.

The core idea is an inversion: **the technician works in Spanish, and the customer
gets an invoice in professional English.** A tech taps the parts they replaced on a
grid of schematic icons, and a clean, standardized invoice description assembles
itself while they work — no typing on a phone in an attic.

## Status

Phase 0 (foundations) and a working slice of the invoice builder. See
[`docs/roadmap.md`](docs/roadmap.md).

## Stack

| Layer         | Choice                                               |
| ------------- | ---------------------------------------------------- |
| Web           | Next.js 15 (App Router), React 19, TypeScript strict |
| Styling       | Hand-written CSS Modules on a design-token layer     |
| State         | Zustand                                              |
| i18n          | next-intl (`es` default, `en`)                       |
| Design system | `packages/ui` + Storybook                            |
| CI            | GitHub Actions — format, typecheck, test, build      |

Later phases add a FastAPI backend, offline sync via IndexedDB, and an agentic
diagnostic assistant. Those are scoped in the roadmap, not stubbed in the code.

## Layout

```
apps/web        Next.js app
packages/ui     design system: tokens, components, HVAC icon set, Storybook
docs/adr        why each significant decision was made
```

## Running it

```bash
pnpm install
pnpm dev          # app on http://localhost:3000
pnpm storybook    # design system on http://localhost:6006
pnpm typecheck && pnpm test
```

Node 22+ and pnpm 10+.

Reading equipment nameplates from photos needs an Anthropic API key on the
server. Copy `apps/web/.env.example` to `apps/web/.env.local` and set
`ANTHROPIC_API_KEY`. Without it, everything else works and nameplate fields
are typed by hand.

### Technician logins

Every screen requires a login. Add technicians from the repo root:

```bash
pnpm tech add Juan Perez      # prints the username and a PIN, once
pnpm tech list
pnpm tech reset-pin juan-perez
pnpm tech remove juan-perez
```

With `pnpm dev` (the `hvac` command) changes apply immediately. A production
server reads them at startup, so restart or redeploy it after a change.

### ServiceTitan

Set `ST_TENANT_ID`, `ST_APP_KEY`, `ST_CLIENT_ID` and `ST_CLIENT_SECRET` in
`apps/web/.env.local` to look up jobs and send equipment. To try the flow
without credentials, set `ST_MODE=mock` and search for job `75907463`. See
[ADR 0008](docs/adr/0008-technician-logins-and-servicetitan-writes.md).

## Design notes

The palette is taken from the refrigeration manifold gauge set: the low-side
(suction) gauge is blue, the high-side (liquid) gauge is red, and the line set
between them is copper. Those three colors carry meaning consistently through the
app rather than decorating it.

Part icons are drawn as **schematic symbols**, not illustrations — the same visual
language as the wiring diagram taped inside every unit door, so the grid is
readable without anyone having to learn it.

Accessibility targets come from the job, not from a checklist: 48px minimum tap
targets because the app is used with gloves on, high contrast because it is read in
direct sun on a roof, and no status carried by color alone.
