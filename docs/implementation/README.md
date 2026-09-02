# Implementation roadmap

Status: active

This roadmap converts the accepted architecture, domain language, and generated
screen inventory into an execution order. The trackable work items live in
[`BACKLOG.md`](./BACKLOG.md).

## Product priority

1. **Mobile app** — highest priority. There is one Expo application with a
   Client experience and four role-routed Staff experiences.
2. **Backend** — second priority as a product surface, but backend work is pulled
   forward whenever the next mobile journey needs a real API, database rule, or
   background job.
3. **Admin web** — lowest priority. It remains required before production can be
   operated fully, but it does not delay mobile journeys that can use local
   fixtures or explicit development commands.

This is a vertical-slice plan. A mobile screen backed only by hard-coded data is
not considered complete. Each slice includes the minimum backend behavior,
OpenAPI contract, generated client, and tests needed to make that journey work
locally.

## Sources

- [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md) and the three context glossaries own
  domain terms and business rules.
- [`docs/architecture/README.md`](../architecture/README.md) and accepted ADRs
  own architecture decisions.
- [`docs/design/prompts/README.md`](../design/prompts/README.md) indexes the
  designed Client, Staff, and admin-web journeys.
- Generated files under [`design/`](../../design/) are references only and are
  never edited by hand.

## Current state

The monorepo, three application shells, backend HTTP boundary, local Prisma and
PostgreSQL configuration, committed OpenAPI document, and generated
`api-contracts` package exist. The approved 15-table System Identity,
Client/Staff/Branch, and image-asset foundation is implemented in the first
business migration with disposable PostgreSQL integration coverage. The mobile
app now contains the complete first Client authentication journey; signed-in
destinations and the admin application still contain starter screens.

The complete first-release data model and relationship diagram are in
[`full-release-schema-proposal.md`](./full-release-schema-proposal.md). The
foundation rows are approved and implemented; every remaining proposed slice
still requires explicit approval of its schema and generated migration SQL.

Concrete examples for the approved foundation tables—including the application
events that insert rows and representative values after insertion—are recorded
in
[`approved-foundation-table-examples.md`](./approved-foundation-table-examples.md).

The pg-boss authentication-email foundation and complete backend Identity slice
are implemented: Client registration and verification, Account activation,
Login and logout, password recovery and change, Account-wide Authentication
Session revocation, and verified-link inspection. `MOB-005` now connects the
generated Authentication Session API to SecureStore, restores the current
Account at startup, routes every current Role, clears Account cache on logout,
and centralizes safe authentication-link ingress. `MOB-006` adds optional
Face ID/fingerprint protection around local credential retrieval, explicit
unlock state and entry, invalidated-key cleanup, and native Face ID permission
configuration without changing backend authentication. The user approved
implementing `MOB-004` from the existing generated visual patterns plus the
accepted behavior in follow-ups 33–38 without waiting for the corrected
`DES-001` export. `MOB-004` now provides email-only registration and Login,
pending-email correction/resend/cancellation, neutral Login rejection,
server-timed throttling, recovery requests, verified-link return, preflight
link inspection, Account activation, and password recovery with replacement
Session start. Generated files under `design/` remain read-only; `DES-001` stays
pending so a future design export can be reconciled with the working app.

Authentication follow-ups 33–38 are pending in the design workflow. Until a new
export applies and verifies them, generated authentication screens still show
superseded phone and temporary-password behavior. The working mobile app follows
the accepted follow-up behavior and will be reconciled with that future export.

## Delivery phases

| Phase                               | Outcome                                                                                     | Primary surface               | Exit condition                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------- |
| 0. Foundation                       | Local workspace, backend boundary, Prisma, OpenAPI clients                                  | Backend/tooling               | Complete                                                                                            |
| 1. Mobile foundation                | Design tokens, navigation, testing, API adapter, secure local boundaries                    | Mobile                        | A tested app shell can route unauthenticated, Client, and each Staff Role                           |
| 2. Identity                         | Registration, verification, activation, Login, recovery, and opaque Authentication Sessions | Mobile + backend              | Client and Staff can complete their real account journeys locally using a development email adapter |
| 3. Client discovery                 | Home, Branch and Session browsing, Plans, Subscription summary, and profile                 | Client mobile + backend       | A seeded Client can browse real local API data without hard-coded screen data                       |
| 4. Booking                          | Booking, Waitlist, cancellation, Reschedule, history, and Attendance rules                  | Client/Staff mobile + backend | The complete class lifecycle works locally with concurrency and authorization tests                 |
| 5. Payments                         | Plan purchase, Credit, Referral, receipt upload, transfer review, and cash Payment          | Client/Staff mobile + backend | A Client can obtain a Subscription through transfer or Assistant-recorded cash                      |
| 6. Staff operations                 | Trainer, Assistant, Administrator, and Nutritionist role journeys                           | Staff mobile + backend        | Every designed Staff home and drill-down flow works with Role and Branch authorization              |
| 7. Notifications and mobile release | Durable inbox, push delivery, caching, deep links, and release validation                   | Mobile + backend              | Critical mobile journeys pass automated tests on release builds                                     |
| 8. Backend production hardening     | Worker operations, compatibility, recovery, observability, and data lifecycle               | Backend                       | Production gates in the architecture roadmap are satisfied                                          |
| 9. Admin web                        | Desktop administration, Back Office, reporting, and deployment                              | Admin web + backend           | All AW01–AW34 journeys are implemented and production-operable                                      |

## Sequencing rules

- Keep only one backlog item `in progress` at a time unless the user explicitly
  chooses parallel work.
- Pull backend work immediately before the mobile journey that consumes it.
- Present every proposed database schema and migration impact for explicit
  approval before creating or applying a migration.
- Regenerate OpenAPI and `api-contracts` in the same change as every transport
  contract update.
- Use local adapters and fixtures first. Create provider accounts only at the
  backlog gate that needs a real provider integration.
- Do not start an admin-web epic merely because its backend data exists. Finish
  the active mobile slice first.
- Update backlog status and evidence in the same commit that completes an item.

## Definition of done

A backlog item is `done` only when its applicable conditions are met:

- Behavior follows the owning glossary, ADRs, and the current verified design.
- New behavior was developed through Red → Green → Refactor.
- Authorization and runtime validation exist at the backend boundary.
- Database constraints and transaction behavior are tested where relevant.
- OpenAPI and generated clients are current.
- The affected application has loading, empty, error, and success behavior where
  the design or journey requires them.
- Relevant formatting, lint, type checking, tests, and builds pass.
- The backlog entry links the completion commit as evidence.

## External-service gates

No new account is needed for the next local slices.

- Use a local email-capture adapter until real SendPulse delivery is tested.
- Use a local object-storage adapter until the transfer-receipt slice reaches R2
  integration testing.
- Use the local notification inbox until Expo Push Service is tested on a real
  development build.
- Configure shared development and production hosting only when local critical
  journeys are stable enough to deploy.

## First execution queue

1. `MOB-001` — install the mobile test stack and establish design tokens and
   reusable primitives.
2. `MOB-002` — create the static React Navigation shell and Role routing.
3. `MOB-003` — establish the API, cache, SecureStore, and environment boundaries.
4. `IDN-001` — present the first Account/Client/authentication schema proposal
   for approval.
5. `DES-001` — apply and verify authentication design follow-ups 33–38 before
   implementing those screens.
6. Continue the identity vertical slice in backlog dependency order, including
   the approved pg-boss email-job foundation before registration sends mail.
