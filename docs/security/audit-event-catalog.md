# Audit event catalog

Source of truth for every `system.audit_records` action code
([ADR-0055](../adr/0055-store-focused-audit-records-in-postgresql.md)). A use
case that writes an audit record must use a code listed here, and a code listed
here must be written by the code base: `src/architecture/audit-catalog.spec.ts`
fails when the two drift. Adding a sensitive workflow means deciding, in the
same change, whether it belongs in the table below or in *Considered and not
audited*.

Every record is written in the same transaction as the change it describes, and
the table is append-only (the `audit_records_reject_update_or_delete` and
`audit_records_reject_truncate` triggers). Metadata stays minimal: never
passwords, tokens, link secrets, file contents, or copies of personal data
beyond what the table below names.

## Catalog

| Action code | Context | Written when | Actor | Target | Branch | Metadata |
| --- | --- | --- | --- | --- | --- | --- |
| `account.activated` | System Identity | An invited Client or Staff Member (or the bootstrap Administrator) sets their first password through an Activation Link | The Account itself (`account`) | `account` | — | `domainIdentity` (`client` / `staff`) |
| `account.password_changed` | System Identity | A signed-in Account changes its password; its other Authentication Sessions are revoked | The Account itself | `account` | — | — |
| `account.password_recovered` | System Identity | A Password-Recovery Link replaces the password; every Authentication Session is revoked | The Account itself | `account` | — | — |
| `pending_client_registration.cancelled` | System Identity | A self-registering Client cancels the pending registration | `system` (unauthenticated continuation) | `account` | — | `initiatedBy` |
| `pending_account.expired` | System Identity | The cleanup removes an expired, untouched pending Account | `system` | `account` | — | `domainIdentity` |
| `client_invitation.created` | System Identity | An Assistant or Administrator invites a Client | Staff Account and Role | `account` | — | — |
| `client_invitation.resent` | System Identity | The invitation's Activation Link is reissued | Staff Account and Role | `account` | — | — |
| `client_invitation.email_corrected` | System Identity | The pending invitation's email is corrected | Staff Account and Role | `account` | — | `previousEmail` |
| `client_invitation.cancelled` | System Identity | A pending invitation without activity is removed | Staff Account and Role | `account` | — | `email` (the removed Account no longer exists) |
| `administrator_bootstrap.created` | System Identity | The bootstrap command creates the first, pending Administrator | `bootstrap` | `account` | — | — |
| `administrator_bootstrap.activation_resent` | System Identity | The bootstrap command reissues the pending Administrator's link | `bootstrap` | `account` | — | — |
| `staff_member.created` | Booking & Membership | An Administrator creates a Staff Member with a pending Account | Administrator | `account` | — | `role`, `branchIds` |
| `staff_member.activation_resent` | Booking & Membership | An Administrator reissues a pending Staff Member's Activation Link | Administrator | `account` | — | — |
| `staff_member.role_changed` | Booking & Membership | An Administrator changes a Staff Member's Role | Administrator | `account` | — | `previousRole`, `role` |
| `staff_member.branches_changed` | Booking & Membership | An Administrator assigns or removes Branches | Administrator | `account` | — | `added`, `removed` |
| `staff_member.deactivated` | Booking & Membership | An Administrator deactivates a Staff Member (Account disabled, sessions revoked) | Administrator | `account` | — | `role` |
| `plan.created` | Booking & Membership | An Administrator creates a Plan | Administrator | `plan` | — | `priceCentavos` |
| `plan.updated` | Booking & Membership | An Administrator edits a Plan | Administrator | `plan` | — | `previousPriceCentavos`, `priceCentavos` |
| `plan.visibility_changed` | Booking & Membership | An Administrator hides or shows a Plan | Administrator | `plan` | — | `visible` |
| `payment.transfer_confirmed` | Booking & Membership | An Administrator confirms a transfer Payment | Administrator | `payment` | — | `method`, `priorState`, `newState`, `amountDueCentavos`, `creditAppliedCentavos` |
| `payment.transfer_rejected` | Booking & Membership | An Administrator rejects a transfer Payment | Administrator | `payment` | — | `method`, `priorState`, `newState`, `amountDueCentavos`, `creditAppliedCentavos` |
| `payment.cash_confirmed` | Booking & Membership | An Assistant or Administrator records a cash Payment | Staff Account and Role | `payment` | Collection Branch | `method`, `priorState`, `newState`, `amountDueCentavos`, `creditAppliedCentavos` |
| `payment.credit_only_confirmed` | Booking & Membership | A Client completes a purchase entirely with Credit | Client Account | `payment` | — | `method`, `priorState`, `newState`, `amountDueCentavos`, `creditAppliedCentavos` |
| `session.cancelled` | Booking & Membership | An Administrator cancels a Session with Bookings (last resort) | Administrator | `session` | Session Branch | `cause`, `cancelledBookings`, `closedWaitlistEntries` |
| `session.updated` | Booking & Membership | An Administrator edits one Session (Trainer swap, new start, or capacity) | Administrator | `session` | Session Branch | previous and new `trainerStaffMemberId`, `startsAt`, `capacity` (only those changed) |
| `evaluation.cancelled_by_staff` | Booking & Membership | The Nutritionist or an Administrator cancels a booked Evaluation | Staff Account and Role | `evaluation` | Slot Branch | `cause`, `insideClientWindow` |
| `salary_payment.recorded` | Back Office | An Administrator records a Salary Payment | Administrator | `salary_payment` | — | `amountCentavos`, `paidOn` |
| `salary_payment.updated` | Back Office | An Administrator corrects a Salary Payment | Administrator | `salary_payment` | — | previous and new `staffMemberId`, `amountCentavos`, `paidOn` (only those changed) |
| `expense.recorded` | Back Office | An Administrator records a Branch Expense | Administrator | `expense` | Expense Branch | `amountCentavos`, `incurredOn`, `expenseCategoryId` |
| `expense.updated` | Back Office | An Administrator corrects an Expense (the Branch never changes) | Administrator | `expense` | Expense Branch | previous and new `expenseCategoryId`, `amountCentavos`, `incurredOn` (only those changed) |

Back Office money records follow BKO-001 D17: Salary Payments and Expenses are audited; Supplies, Withdrawals, Restocks, and Expense Categories are not (below).

## Considered and not audited

| Workflow | Why not |
| --- | --- |
| Login success, failure, and throttling | Throttle events already record the security signal; a success audit per sign-in would be high-volume routine activity. |
| Logout of the current Authentication Session | The Account ends its own sign-in; the session row keeps `revoked_at` and the reason. |
| Client registration and email verification | Routine self-service; the Account row records the timestamps. |
| Session Schedule create, replace, end (cancelling unbooked Sessions as `schedule_changed`) | The schedule rows keep their effective range and the cancelled Sessions record the actor; no booked class changes. |
| Client Booking, cancellation, Reschedule, Waitlist join/leave | Routine Client activity (ADR-0055); `created_by`/`cancelled_by`/`rescheduled_by` Account columns keep who acted, including an Assistant acting for a Client. |
| Trainer Attendance | A reporting record with `recorded_by` and no money or access effect. |
| Automatic empty-Session cancellation, Waitlist closure, Purchase Intent expiry | System sweeps with no human actor; the rows record cause and time (BOOK-001, BOOK-004, PAY-002). |
| Client Evaluation booking and cancellation | Routine Client activity; the Evaluation row records creator, canceller, and cause. |
| Availability Block create, replace, end | The Nutritionist manages their own schedule; the block row records `created_by`/`ended_by`, and booked Evaluations are never changed by it. |
| Transfer receipt upload and Purchase Intent creation | Client self-service with no decision; the Payment decision is audited instead. |
| Credit ledger entries | The ledger itself is append-only and actor-stamped; the Payment audit references the purchase. |
| Supply create, edit, and archive; Withdrawals and Restocks | Stock rows record their actor and time, move no money, and the database keeps the quantity reconciled with the movements (BKO-001 D4, D17). |
| Expense Category create and delete | A label with no money of its own; deletion is refused while any Expense uses it (BKO-001 D13). |

## Retention (provisional)

Audit retention, archival, and export are data-governance decisions reserved to
BE-007 (ADR-0055). Until BE-007 decides them:

- audit records are kept **indefinitely**; the append-only triggers mean no
  application path can delete them, and BE-008's retention sweeps never touch
  this table;
- the two codes that carry an email (`client_invitation.email_corrected`,
  `client_invitation.cancelled`) are the only personal data stored in
  metadata; BE-007 decides whether Account closure redacts them.

Open question for BE-007: how long must audit records be kept (for example,
financial records under Bolivian tax obligations versus security events), and
must personal data in audit metadata be redacted when an Account is closed?
