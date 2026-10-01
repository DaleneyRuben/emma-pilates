# BE-013 — Staff-initiated authentication email budgets

Status: **decided 2026-10-01 under the blanket backlog-decision approval**
(the user asked for a short proposal and delegated the open decisions).

## Problem

ADR-0029 says «Authorized staff resends remain subject to the recipient limit
as well as broader source limits; there is no unrestricted staff bypass».
BE-012 built the client-wide and network-wide budgets for the four public
flows and left the staff flows to this row (its decision S12). Today the seven
staff commands that can send an activation or verification email only meet
the recipient-and-purpose lane, so one staff Account, or a stolen staff
Authentication Session, can send an unbounded number of emails as long as it
rotates addresses: a fresh address always has a fresh recipient lane.

## Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| T1 | **What is budgeted: the signed-in Account**, not the Authentication Session, the device, or the network. | A session is free to replace (log in again), so a per-session budget is bypassed by design. The Account is the strongest source identity a staff request has, it is the one ADR-0029's «authorized staff» refers to, and it covers the Staff app and the admin web together. |
| T2 | **Which commands share it.** One shared staff budget for all seven: the Assistant's `inviteClient` (S05), `correctClientInvitationEmail`, `resendClientInvitation`, and `sendClientVerification` (S05/S06), and the Administrator's `createStaffMember`, `resendStaffMemberActivation`, and `correctStaffMemberEmail` (AW24). Cancellation, reads, and the CLI bootstrap (IDN-006) are not budgeted: they send no email or are not reachable over HTTP. | Every one of them can enqueue an activation or verification email to an address the caller chooses; splitting them would multiply an attacker's allowance, as BE-012 S2 argued for the public verification group. |
| T3 | **Numbers.** 20 per rolling 15 minutes and 100 per rolling 24 hours per Account. | A busy desk invites a Client every minute or two, so 20 in 15 minutes never stops a real Assistant; an opening day with dozens of new Clients still fits in 100. It is twice BE-012's device lane for a quarter hour and a bit over three times for a day, because staff are authenticated and audited, while still capping a stolen session at 100 emails a day. |
| T4 | **No device or network lane for staff.** Staff requests are not counted in BE-012's public lanes, and BE-012's lanes do not apply to these commands. | The studio's Wi-Fi is shared with Clients: an Assistant onboarding at the desk must not exhaust the network lane that public registration and recovery depend on, and vice versa. The Account lane already identifies the caller better than either signal. |
| T5 | **What counts.** Every authenticated request admitted by the budget adds one event, whatever the use case then does (email sent, recipient-lane suppression, `email_in_use`, not found, access denied, a malformed body). A request without a valid credential is not counted and gets the usual `401` from the handler. A refused request adds nothing and does not extend the window. | It mirrors BE-012 S5: the check runs before the use case, so a refusal provably changes nothing, and counting requests needs no change to the invitation and staff-management units of work. Refusals not counting mirror Login: hammering during a wait does not lengthen it. |
| T6 | **Order.** The budget is a Nest guard on the seven handlers (`@StaffEmailBudget(purpose)`), so it runs before body parsing, authentication inside the handler, and the use case. It resolves the principal itself without marking the session active (`meaningfulActivity` false); the handler then authenticates as before. A request stopped here issues no token, invalidates no link, restarts no pending window, and sends nothing; an admitted request then meets the unchanged recipient lane, which keeps answering `email_throttled`. | ADR-0029: «A request stopped by any layer sends no email and does not issue a token…». The guard keeps the large controllers and units of work untouched; the second principal lookup is one indexed read on seven infrequent endpoints. |
| T7 | **Response: distinct from `email_throttled`.** A full budget answers **429** with code `staff_email_throttled`, detail «Too many emails were requested from this Account. Try again later», and `Retry-After` in whole seconds, rounded up: the wait until enough of the oldest events leave the full window (`rollingBudgetWaitSeconds`, as both BE-012 lanes and the recipient lane). | `email_throttled` means «this address was emailed recently; the current link still works». Here the address may never have been emailed (a new invitation), so reusing the code would show the Assistant a false message. A staff interface may say the limit is theirs (ADR-0029 lets staff interfaces reveal what their Role manages), so the copy can be specific. |
| T8 | **Storage.** Events in `system.authentication_throttle_events` with a new event kind `staff_email_requested`, a new nullable `account_id` column (foreign key to `system.accounts`, `ON DELETE RESTRICT`, index on `(account_id, occurred_at)`), the purpose `activation` or `verification` of the email the command would send (S05/S06's verification offer is `verification`, every other command `activation`), and no recipient, Login-lane, client, or network digest. Events expire 24 hours after they occur, the existing retention sweep soft-deletes them 30 days later (ADR-0086), and reads ignore rows with `deleted_at` and read both purposes. | Reuses BE-012's table, expiry, and sweep. The Account id is an internal identifier, not a raw signal like an address or an installation id, so a foreign key gives integrity where a digest would hide nothing. It is a schema change: see the [migration review](./BE-013-migration-review.md). |
| T9 | **Concurrency.** Check-and-record in one short transaction behind a transaction-scoped advisory lock on the Account (`staff-email:<account id>`), as BE-012 S11. | Parallel requests from one stolen session cannot all take the last slot. |
| T10 | **Building blocks.** `security/rolling-budget.ts` for the windows; a new `staff-email-budget/` slice with the pure policy, the admission function, its Prisma gateway, and the guard plus decorator, modelled on `email-source-budget/`. The Booking-owned staff-management controller uses the decorator through this slice, added to the architecture test's shared slices like `system-identity/staff-accounts`. | One rolling-window implementation; the second budget is a second policy, not a second limiter. |
| T11 | **Audit.** A refusal writes no audit record and no extra log line. | The admitted commands already write their audit records; a flood from a stolen session would otherwise flood the audit log. The 24-hour events (kept 30 days after expiry) and the request log's `429` already show who was stopped and when. |
| T12 | **The previous mobile release** does not know `staff_email_throttled`: S05 shows «No pudimos crear la cuenta. Inténtalo de nuevo.» and S06 «No pudimos reenviar el enlace…» / «No pudimos cambiar el correo…» / the verification fallback, with no countdown. Nothing was sent or changed, so a retry is safe; OpenAPI only gains a documented `429` on the seven operations, which `check:api-compat` accepts. The current Staff app and the admin web show the Account limit with its countdown (step 4 of the item checks the designs). | Compatibility with the current and previous mobile release (coding standards). |

## Response

```json
{
  "type": "about:blank",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Too many emails were requested from this Account. Try again later",
  "instance": "/api/v1/assistant/client-invitations",
  "code": "staff_email_throttled"
}
```

with `Retry-After: <seconds>`. The recipient lane's `email_throttled` response
is unchanged.

## Tests

Unit tests for the policy (both windows, the wait) and the admission function;
a Prisma integration test on a disposable `pilates_test_*` database for
check-and-record, expiry, soft-deleted rows, isolation from BE-012's
`email_requested` events and between Accounts, and concurrent admission; e2e
tests for the `429` Problem Details and `Retry-After` on an Assistant and an
Administrator command, the shared budget across commands, the unauthenticated
request passing through to `401`, and the recipient lane's `email_throttled`
staying as it is.
