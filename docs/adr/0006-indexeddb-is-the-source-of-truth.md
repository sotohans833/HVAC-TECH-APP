# 0006 — IndexedDB is the source of truth, not a cache

**Status:** accepted · **Date:** 2026-09-04

## Context

Until now the open job lived only in memory. Closing the tab lost it. That is
not a rough edge on a field app — a technician who fills out a ticket on a roof
and loses it has been actively harmed by the tool.

The roadmap had a server as the next phase. Building it first would have made
the network the thing that makes work durable, which is exactly backwards for
this product: technicians work in attics, crawlspaces and equipment closets
where there is no signal, and that is precisely when they are recording parts.

## Decision

The job record is written to IndexedDB (via Dexie) and read back from it. The
open draft is loaded on mount, and edits are written back on a 400 ms debounce.
Finishing a job marks it completed and opens a fresh one; completed jobs stay in
a local history the technician can reopen.

Phase 2b adds a FastAPI server that **reconciles against** this store. It is a
replica, not the authority. Nothing in the app will block on a request to record
work.

Two details worth stating because they were deliberate:

- **Hydration happens in an effect, not during render.** The first client paint
  matches the server output and only then is the stored draft applied, so React
  never reports a mismatch.
- **Every storage call is wrapped.** Private browsing, blocked site data and a
  corrupt database all fail the write and leave the app working for the session.
  Losing a save is survivable; crashing the ticket in front of the technician is
  not.

## Consequences

- The app is usable offline today, with no server and no account.
- An untouched job is never written, so the history does not fill with empty
  drafts.
- There is exactly one open draft at a time. A technician on a roof should never
  have to decide which half-written ticket is the live one.
- The store now holds the whole job record, mirroring what is stored, so
  persistence is a single put rather than a mapping layer.
- Storage is per-browser and per-device until 2b. Clearing site data loses the
  history, and that is the honest state of things until sync exists.
