# BE-012 — Client-wide and network-wide email budgets

Status: **decided 2026-10-01 under the blanket backlog-decision approval**
(the user asked for a short proposal and delegated the open decisions).

## Problem

ADR-0029 layers three limits on every request that could send a
verification, activation, or password-recovery email: a recipient-and-purpose
lane (built in IDN-003/IDN-005, neutral suppression), a budget per
first-party client identifier, and a looser budget per trusted network
address. It leaves the last two «to be defined», so today an attacker can
rotate addresses from one installation or one network without limit, and the
429 states that Client 01, 20, Staff S18, and admin AW30 already draw are
unreachable.

## Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| S1 | The source budgets guard the four public flows: `POST /api/v1/client-registrations` (registration, also from Login), `…/client-registrations/verification-resends`, `…/client-registrations/email-corrections`, and `POST /api/v1/password-recovery-requests` (mobile 20/S18 and admin AW30 share it). | BE-012's scope. Staff-initiated invitation and verification emails are authenticated and audited; their source budget is a separate row (S12). |
| S2 | **Budget groups.** Registration, resend, and correction share one *verification* budget; password recovery has its own *recovery* budget. | All three verification flows produce the same kind of email for the same pending registration journey, so splitting them would triple an attacker's allowance. Recovery is a different journey: a person stuck in registration must not lose recovery, and recovery already has the stricter recipient lane. |
| S3 | **Client lane** (per client identifier, across every address): verification 10 per rolling 15 minutes and 30 per rolling 24 hours; recovery 5 per rolling 15 minutes and 10 per rolling 24 hours. | A real journey is a registration, a few resends, perhaps a correction, i.e. well under 10; the day cap stops slow enumeration from one installation. The 15-minute window matches Login's origin window. |
| S4 | **Network lane** (per network address, across every client identifier): verification 50 per 15 minutes and 200 per 24 hours; recovery 25 per 15 minutes and 100 per 24 hours. | ADR-0029 makes it looser than the client lane because carrier-grade NAT and the studio's Wi-Fi put many people behind one address. Five times the client lane, as Login's 100 vs 20. |
| S5 | **What counts.** Every request admitted by both lanes adds one event, whatever happens next: an unknown or ineligible address, recipient-lane suppression, an expired continuation, a malformed body (400), or a sent email. A request answered 429 adds nothing and does not extend either window. | Counting requests rather than emails sent means the budgets cannot be used to probe whether an address exists or is suppressed (ADR-0029 neutrality). Not counting rejected requests mirrors Login: hammering during a wait does not lengthen it. |
| S6 | **Order.** The source budgets are checked before the use case runs, so a request stopped there issues no token, invalidates no link, restarts no pending window, and sends nothing. An admitted request then meets the unchanged recipient lane, which keeps answering the neutral success with no recipient `Retry-After`. | ADR-0029: «A request stopped by any layer sends no email and does not issue a token…». |
| S7 | **Client identifier.** The `x-client-identifier` header, valid when it matches Login's pattern `^[A-Za-z0-9_-]{16,128}$`; otherwise the admin web's `__Host-emma-admin-client` cookie when it holds a valid value (it is never minted here). A missing or malformed identifier falls back to the network lane alone: no client event is checked or recorded, and the request is never refused for lacking one. | ADR-0029: the identifier is an untrusted signal and missing ones «fall back to network protection rather than bypassing throttling». The cookie is how the admin web identifies itself to Login (ADR-0084). |
| S8 | **Mobile sends the identifier.** `createAuthenticationApi` sends the installation identifier Login already uses (`getOrCreateInstallationIdentifier`) on registration, resend, correction, and recovery requests. | Without it every Client and Staff request would land in the network lane only (the gap recorded in the row). |
| S9 | **Network address and proxies.** The address is `request.ip`, exactly as Login takes it. Express `trust proxy` is unset, so it is the direct connection and an `X-Forwarded-For` from the requester is ignored. When a hosting proxy is chosen, trusting it is one Express setting that serves Login and these budgets together. | Reuse Login's rule (ADR-0029: «never an arbitrary forwarded header»); no second scheme. |
| S10 | **Keys.** The same keyed digests as Login: HMAC-SHA-256 under `AUTHENTICATION_EMAIL_DIGEST_KEY` of `client:<identifier>` and `network:<address>`, stored in the existing `client_digest`/`network_digest` columns. Events use the purpose `verification` or `password_recovery` and a new event kind `email_requested`; they expire 24 hours after they occur and the existing retention sweep soft-deletes them 30 days later (ADR-0086). Reads ignore rows with `deleted_at`. | ADR-0029: «keyed derived values rather than retaining raw client identifiers or network addresses». The existing indexes on `(client_digest, occurred_at)` and `(network_digest, occurred_at)` serve the reads. The new enum value is the only schema change (migration review first). |
| S11 | **Concurrency.** Check-and-record runs in one short transaction that first takes transaction-scoped advisory locks on the network key and then the client key, so parallel requests from one source cannot both take the last slot. | ADR-0029 shared PostgreSQL state; deliberate transactions per the coding standards. Fixed lock order avoids deadlocks. |
| S12 | Staff-initiated emails (Assistant invitations and S05 verification, administrator Staff invitations) stay under the recipient lane only for now; a new backlog row applies a per-Account source budget to them. | ADR-0029 wants «broader source limits» there too, but the staff screens draw the recipient wait (`email_throttled`), and a per-session budget needs its own numbers. |

## Response

A refused request answers **429** with RFC 9457 Problem Details:

```json
{
  "type": "about:blank",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Too many requests from this device or network. Try again later",
  "instance": "/api/v1/password-recovery-requests",
  "code": "authentication_email_throttled"
}
```

and `Retry-After` in whole seconds (rounded up): the longest wait among the
full windows of both lanes, each until enough of its oldest events leave it —
the same rule the recipient lane uses (`authenticationEmailWaitSeconds`).
Nothing in it depends on the address in the body or on whether an Account
exists; the same source gets the same answer for any address. OpenAPI
documents the optional `x-client-identifier` header and the 429 response on
the four operations. Clients branch on the status (and may on the code); the
apps already show «Demasiadas solicitudes…» with «Podrás reenviarlo en m:ss.».

## Building blocks

- `security/authentication-digest.ts` — the keyed digest the module repeats
  inline today, shared with Login.
- `security/rolling-budget.ts` — the rolling-window wait extracted from the
  recipient lane, reused by both lanes.
- `email-source-budget/` — the budget policy (pure), the admission use case,
  its Prisma gateway, and a Nest guard plus `@EmailSourceBudget(group)`
  decorator that the four controller methods carry. No change to the
  registration unit of work or the recovery gateway.

## Tests

Unit tests for the policy (each window and lane, fallback without a client
identifier, the wait) and the admission use case; a Prisma integration test on
a disposable `pilates_test_*` database for check-and-record, expiry, soft
deleted rows, lane isolation by purpose, and concurrent admission; e2e tests
for the 429 Problem Details, `Retry-After`, the header and cookie identifier,
the ignored `X-Forwarded-For`, and the recipient lane staying neutral.
