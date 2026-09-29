# BE-007 — Data governance proposal

Status: **accepted and built 2026-09-28** (backend, contracts, runbooks; the Client and admin screens wait for their design, see the BE-007 row in the backlog). The decisions below were taken under the blanket
backlog-decision approval on top of
[ADR-0086](../adr/0086-soft-delete-every-database-row.md): nothing in the
application schemas is ever physically deleted. The owner confirmed G7 on
2026-09-28.

It answers the questions earlier items left for BE-007:

- how long audit records are kept, and whether their emails are redacted
  ([audit event catalog](../security/audit-event-catalog.md), IDN-008);
- how long Salary Payments and Expenses are kept (BKO-001 Q4);
- how long Evaluation data is kept (NUT-001 open item 1).

## Decisions

| # | Decision |
| --- | --- |
| G1 | **Retention: indefinite.** Every business and audit row stays for the life of the system: Payments, Subscriptions, the Credit ledger, Bookings, Attendance, Evaluations, Salary Payments, Expenses, Supplies, Withdrawals, and audit records. That already covers any Bolivian tax or accounting retention period, so no per-table period is set. Swept operational rows (BE-008) stay marked removed. |
| G2 | **A Client can close their own Account from the app.** Perfil → Cerrar mi cuenta, confirmed by re-entering the password. An Administrator can also close a Client's Account from the admin web (AW22). Staff Members are never closed; deactivation (IDN-007) remains their end state. |
| G3 | **Closure refuses a pending transfer Payment.** A Client with a Payment awaiting review gets `409 closure_payment_pending` until an Administrator confirms or rejects it. That way no Payment decision lands on a closed Account. |
| G4 | **Closure cancels what is still ahead, without penalty.** Every future Booking is cancelled with the new cause `account_closed`: it returns no class, since the Subscription ends anyway, and never counts as a late cancellation. Every future Evaluation is cancelled with the same cause, and every open Waitlist entry is closed. |
| G5 | **Closure ends the Subscription and forfeits the Credit.** An active or upcoming Subscription is marked ended at closure, with its remaining classes forfeited and no refund. The Credit balance is forfeited through a ledger entry of kind `account_closure` (the ledger is append-only). The confirmation screen states both before the Client confirms. |
| G6 | **What closure does to the Account.** In one Serializable transaction, the Account and Client are marked removed (`deleted_at`, ADR-0086). Every Authentication Session is revoked with the new reason `account_closed`, every unused link is invalidated, and every device is deactivated. The audit record `account.closed` has actor kind Client or Administrator. The email becomes free for a new registration through the live-only index. The Client leaves every directory, count, and referral lookup (BE-011). |
| G7 | **No redaction or anonymization.** A closed Account keeps its name, email, phone, and history, but no screen or endpoint shows it any more. This includes the three audit codes that store an email. That is the owner's no-deletion rule applied to values as well as rows. See the open question below. |
| G8 | **Export is not self-service.** A Client's request to see their data (Bolivian Constitution art. 130, habeas data) is answered by an operator. A runbook has one read-only query per context, and the result goes to the Client by email within 15 business days. No export endpoint or screen is built now. |
| G9 | **Backups and restore drills.** ADR-0027 already takes a daily logical `pg_dump` to private R2 storage. BE-007 adds: keep 35 daily dumps and 12 month-end dumps; run a restore drill every quarter and after every major migration into a disposable database, then run `pnpm smoke` and the fixture-free integration checks against it; record each drill in the runbook's log. Object-storage images are not backed up. Receipts expire by design (ADR-0075), and profile photos and Promotion images can be uploaded again. |
| G10 | **An incident runbook.** Severity levels; freeze deploys; revoke sessions in bulk (all, or per Role); rotate secrets (ADR-0079); restore from the latest verified dump; tell affected Clients by email within 72 hours when personal data was exposed; write the incident in the log. |

## Implementation (after this proposal is approved)

1. Schema, which needs migration approval:
   - `BookingCancellationCause` and `EvaluationCancellationCause` gain
     `account_closed`;
   - `AuthenticationSessionRevocationReason` gains `account_closed`;
   - `CreditLedgerEntryKind` gains `account_closure`.
2. Backend:
   - the `closeClientAccount` use case, red → green, with the G3–G6 rules;
   - `POST /accounts/current/closure` with the password, and
     `POST /administrator/clients/{id}/closure`;
   - the audit catalog gains `account.closed`.
3. Client mobile: Perfil → Cerrar mi cuenta, a confirmation screen, and the
   signed-out landing afterwards. The screen is not designed yet, so a design
   follow-up under `docs/design/prompts/followups/` comes first, following the
   `design-workflow` skill.
4. Admin web: a Cerrar cuenta action on AW22, with the same confirmation
   content. It needs a design follow-up too.
5. Runbooks: `docs/runbooks/personal-data-requests.md` (G8),
   `docs/runbooks/backups-and-restore-drills.md` (G9), and
   `docs/runbooks/incident-response.md` (G10).
6. The audit catalog's retention section is replaced by G1 and G7.

## App Store account deletion (decided)

Apple's App Store guideline 5.1.1(v) requires an app that creates accounts to
let people delete their account from inside the app. G2–G6 give Clients
in-app closure. On 2026-09-28 the owner confirmed that a closed Client's name,
email, and phone stay in the database, hidden from every screen and endpoint,
with no anonymization (G7).
