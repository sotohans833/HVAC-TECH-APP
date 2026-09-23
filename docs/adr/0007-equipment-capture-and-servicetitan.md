# 0007 — Equipment from a nameplate photo, copied into ServiceTitan

**Status:** accepted · **Date:** 2026-09-23

## Context

Customer equipment records in ServiceTitan are often thin or wrong: install
dates defaulted to the day the record was made, capacity and dimensions left as
N/A, a missing floor, an evap coil with no memo saying which attic it is in.
Fixing them means typing a 16-character model number on a phone while standing
next to the unit, which is exactly the kind of typing this app exists to remove.

## Decision

A new **Equipos** screen. The technician photographs the data plate; the photo
is downscaled on the phone and sent to a Next.js route that asks Claude to read
the manufacturer, model, serial, equipment type and any printed manufacture
date, returned as schema-checked JSON. The technician picks the floor, adds a
memo with one-tap shortcuts, checks anything flagged as hard to read, and saves.

- **The name is composed, not typed.** Floor plus type produce "2nd floor
  furnace", matching how the office already names equipment in ServiceTitan.
- **Manufacture date from the serial** for Lennox, Goodman/Amana/Daikin,
  Carrier/Bryant/Payne and 2010-on Trane. Unknown brands get no date rather
  than a guessed one, because age feeds warranty conversations.
- **Offline first still holds** (ADR 0006). The record and its photo are saved
  to IndexedDB. With no signal or no API key, the photo is kept and the fields
  are typed by hand; the plate can be read later with "Leer placa otra vez".
- **A second reading never overwrites a hand correction.** Only empty fields
  are filled.

### Getting it into ServiceTitan

For now each saved unit has a copy button per field and a "Ya está en
ServiceTitan" checkbox, so the technician pastes values into the ServiceTitan
app and can see which units are still pending.

Writing to ServiceTitan directly is possible through its public API (installed
equipment can be created and updated), but it requires the company's
ServiceTitan admin to register and approve an integration and issue
credentials (client ID and secret, app key, tenant ID). Those credentials must
live on a server, never on a technician's phone. That belongs with the Phase 2b
backend: the record shape here already mirrors ServiceTitan's fields, so sync
becomes a mapping plus matching a unit to the customer's location, not a
redesign. Driving ServiceTitan's web UI with a script was rejected: it breaks
on every UI change and is not an authorized integration.

## Consequences

- Reading a plate needs `ANTHROPIC_API_KEY` on the server (see
  `apps/web/.env.example`). Each reading is one small vision request.
- Photos live on the device only until sync exists; clearing site data loses
  them, the same as jobs.
- The `problem` and `uncertain` fields from the reading are shown, not stored:
  once the technician saves, the values are theirs.
