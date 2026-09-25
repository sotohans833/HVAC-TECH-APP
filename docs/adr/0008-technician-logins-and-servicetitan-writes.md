# 0008 — Technician logins, and writing equipment to ServiceTitan

**Status:** accepted · **Date:** 2026-09-25

## Context

The company approved connecting the app to ServiceTitan so any technician can
update a customer's installed equipment from a photo of the nameplate. That
turns the app from one person's tool into something several people use, with
write access to the company's system of record. Two things follow: the app
has to know who is using it, and nothing may reach ServiceTitan without a
technician seeing exactly what will change.

## Decision

### Logins

- Each technician gets a login name and a six-digit PIN, created with
  `pnpm tech add "Name"`. The PIN is printed once and stored only as a scrypt
  hash. PINs rather than passwords because they are typed on a phone with
  gloves; five wrong tries lock the name for fifteen minutes.
- The list lives in one environment variable, not a database. A small team
  changes it a few times a year, and the same value works on the office PC and
  on a host.
- The session is a signed cookie (HMAC-SHA256), valid for 30 days. It carries
  only the technician's id; removing someone from the list ends their session
  on their next request once the server has the new list (immediately under
  `pnpm dev`; after a restart or redeploy in production).
- Middleware runs on the Node runtime so it reads the same live environment as
  the API routes. On the edge runtime it kept stale values after `.env.local`
  changed, so a newly added technician could not get past the login page.
- Every page and every API route requires a session. The nameplate reader is
  included, because each reading costs money.

### ServiceTitan

- The technician enters the job number. The server finds the job (by number,
  then as a job or appointment id copied from a link), its location and
  customer, and the installed equipment already there.
- Sending is a review step, never automatic. The app suggests which existing
  record the unit is (same serial, then same name) or offers to create one,
  and lists each change as old value → new value with a checkbox.
- Writes are limited to five fields: name, serial number, model, manufacturer
  and memo. The route rejects any other key. There is no delete.
- A blank captured field never blanks out an existing value, and the memo is
  appended to, not replaced: the office writes notes there too.
- The manufacture date goes into the memo ("Mfd 05/2012"). ServiceTitan's
  install date is left alone; warranty questions are settled with the
  distributor.
- ServiceTitan attributes changes to the integration, so the server logs which
  technician made each one, and saved units record who captured them.
- `ST_MODE=mock` runs the whole flow against an in-memory demo job, so it can be
  tried before the company's credentials exist.

## Consequences

- The ServiceTitan endpoint paths and field names in
  `lib/servicetitan/client.server.ts` follow the v2 API but have not yet run
  against a real tenant. They are the first thing to verify when the
  credentials arrive, ideally in ServiceTitan's integration environment.
- The lockout counter is in memory. Fine for one server; a multi-instance host
  needs shared storage for it.
- Technicians in the field need the app reachable over the internet, over
  HTTPS. Until it is hosted, it works on the office Wi-Fi only.
