# IDN-008 — Email change for active Accounts

Status: **decided 2026-09-24 under the blanket backlog-decision approval**
(the user pre-approved the migrations of the queue on condition that each has
a proposal and review package committed before the migration).

## Problem

ADR-0029 settles email correction for *pending* Accounts and says that
"changing an already verified login address requires a separate, stricter
policy". No such policy existed, so MOB-008 kept the email read-only on
Client 22 ("Para cambiar tu correo, escríbenos al estudio"). The Client
cannot fix a mailbox they no longer read, and the studio has no tool for it
either (IDN-007 left staff email correction out).

## Product rule (decisions taken under the blanket approval)

| # | Decision | Rationale |
| --- | --- | --- |
| E1 | Only an **active** Account (verified, activated, not disabled) may ask to change its email; the request is authenticated (its own Authentication Session). Pending Accounts keep ADR-0029's correction flows. | The stricter policy ADR-0029 reserves; a pending Account has nothing to protect yet. |
| E2 | The new address is **written only when a Verification Link sent to it is opened**. The link has the registration verification lifetime (**24 hours**), purpose `email_change`, single use; opening it verifies the new address (`email_verified_at`), keeps `activated_at`, and does not sign anyone in. | Proof of control of the new mailbox before it becomes the login identifier; reuses the registration link machinery (tokens, cipher, worker) as asked. |
| E3 | Authentication Sessions **stay valid** through the change (ADR-0030 lists the events that revoke sessions; an email change is not one). | The person is signed in on their own devices; the password did not change. |
| E4 | The **old address receives a notice** at request time (no link): the new address the change was asked for, that nothing changes until the new mailbox confirms it, and that the owner can cancel from Editar perfil or change their password if it was not them. | The old mailbox is the only channel the real owner still controls if a session was stolen. |
| E5 | **One pending change per Account.** A new request replaces it: the previous link is invalidated and a fresh one goes to the (possibly different) new address. | ADR-0029's "only the newest link can succeed". |
| E6 | The signed-in Account may **cancel** (invalidates the link, deletes the pending record) or **resend** (a fresh link to the same pending address, invalidating the older one). | Client 22's pending state («Revisa tu correo nuevo», reenviar, cancelar). |
| E7 | Request and resend use the **verification recipient lane** of ADR-0029, keyed by the *new* address: one email per 60 s, five per rolling hour, ten per rolling day. A suppressed request or resend answers **neutrally** (`202`, the pending record kept as it is, no new token) and sends nothing. | Same abuse controls as registration; no override. |
| E8 | An address **already used by any Account** (active or pending) gets the **neutral answer**: the pending record and its token are stored exactly as for a free address, but no email is queued and no throttle event is recorded. Nothing distinguishes it from a free address the Client cannot read. Its link can never be opened because nobody receives it; the record expires with the link. | ADR-0029's enumeration resistance applies to an authenticated Client too: the request must not reveal whether a third party has an Account. |
| E9 | The Account's **current** address is refused with `400 email_unchanged` (not sensitive: it is the caller's own address). | Nothing to change. |
| E10 | Completing the link **refuses with `email_unavailable`** when the address was taken between request and completion (a race the neutral answer cannot cover). The new address stays unwritten. | `accounts.email` is unique. |
| E11 | A **password change or recovery cancels** the pending change (its link is invalidated). Disabling the Account already invalidates every unused link (IDN-007). | A stolen session that requested a change must not survive the owner taking the Account back. |
| E12 | Audited: `account.email_change_requested` (metadata: none), `account.email_change_cancelled`, and `account.email_changed` (metadata `previousEmail`, like `client_invitation.email_corrected`). The notice and the resend are not audited (the throttle events record them). | Sensitive Account changes (ADR-0055); the previous address lets the studio trace a takeover. Whether Account closure redacts it stays with BE-007. |
| E13 | The command is **Account-level** (`/accounts/current/email-change`), so Staff Members could use it from a future screen; in this item only the Client app (22) exposes it, and the admin web (AW22) keeps showing the current address (the pending one is not shown to staff). | System Identity owns the email; no Booking rule depends on it. |
| E14 | The pending state is read from `GET /accounts/current/email-change` (`{ pending: { email, requestedAt, expiresAt } | null }`), not from the Client profile. | Keeps the identity data out of the Booking profile read. |

## Tables, constraints, and indexes

| Object | Change |
| --- | --- |
| `system.authentication_token_purpose` | new value `email_change` |
| `system.account_email_changes` | new table: `account_id uuid PK` → `system.accounts(id)` on delete cascade; `new_email text not null`; `authentication_token_id uuid not null unique` → `system.authentication_tokens(id)` on delete cascade; `requested_at timestamptz(3) not null`; `expires_at timestamptz(3) not null` |

`account_id` as the primary key enforces one pending change per Account (E5).
The pending record is *live* only while its token is unused, not invalidated,
and not expired; a stale row is replaced by the next request and removed by
completion or cancellation. Expired tokens are not swept yet (BE-008 sweeps
idempotency records, sessions, throttle events, and notifications), so a
stale row can outlive its link until the next request; when tokens are swept
the cascade removes it.

The email is stored in clear like `accounts.email` (it becomes that column on
completion). Throttle digests use the existing HMAC key.

## Migration impact

- Additive (ADR-0078 expand step): the previous API and worker ignore the
  new purpose and table.
- `ALTER TYPE … ADD VALUE` runs inside Prisma's migration transaction; the
  new value is not used by the migration itself, so PostgreSQL allows it.
- Rollback: `DROP TABLE system.account_email_changes;` — the enum value
  cannot be dropped and stays unused (harmless); mark the migration rolled
  back with `prisma migrate resolve --rolled-back`.

## Representative rows

| Event | `account_email_changes` | `authentication_tokens` |
| --- | --- | --- |
| Lucía asks for `lucia.nueva@example.com` | `(lucía, lucia.nueva@…, T1, 15:00, next day 15:00)` | `T1 email_change` current |
| She resends | same row, token `T2` | `T1` invalidated, `T2` current |
| She opens the link | row deleted | `T2` used; `accounts.email = lucia.nueva@…`, `email_verified_at` now |
