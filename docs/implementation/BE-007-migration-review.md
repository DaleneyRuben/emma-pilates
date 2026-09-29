# BE-007 — Account closure migration review

Status: **approved 2026-09-28**. The owner asked for these values and the
closure rules in the BE-007 continuation request; the decisions are G3–G6 of
[BE-007-data-governance-proposal.md](./BE-007-data-governance-proposal.md).

Two expand migrations. They are separate because PostgreSQL cannot use an enum
value in the transaction that adds it (the same split as ADM-001).

## `20260928020000_account_closure_enum_values`

| Enum | New value | Written by |
| --- | --- | --- |
| `booking.BookingCancellationCause` | `account_closed` | Closure cancels every future Booking without penalty (G4) |
| `booking.EvaluationCancellationCause` | `account_closed` | Closure cancels every future Evaluation (G4) |
| `system.AuthenticationSessionRevocationReason` | `account_closed` | Closure revokes every Authentication Session (G6) |
| `booking.CreditLedgerEntryKind` | `account_closure` | Closure forfeits the remaining Credit (G5) |

No existing check constraint lists causes or reasons, so none needs widening
for the first three. Waitlist entries reuse `left` with the closing actor, so
`WaitlistClosureReason` does not change.

## `20260928020100_account_closure_ledger_entry`

| Object | Change | Why |
| --- | --- | --- |
| `credit_ledger_entries_parent_check` | adds a branch: `account_closure` has neither a Reservation nor a Referral | The old check accepted only the four existing kinds |
| `credit_ledger_entries_one_closure_per_client_key` | new partial unique index `WHERE kind = 'account_closure'` | Closure happens once per Client; a retry cannot forfeit twice |

The amount check (`> 0`) already holds: closure writes no entry when the
available Credit is zero. The ledger stays append-only (its trigger is
unchanged).

## Application code that changes with the enum

`summarizeCredit` subtracts `account_closure` from the available Credit, so a
closed Client reads zero. Nothing else switches over these enums.

## Rollout and rollback

- Expand-only (ADR-0078): the previous API and worker never read or write the
  new values.
- Applied only to `pilates_dev_sim` and `pilates_test_fixtures`; never to
  `emma_pilates`.
- Rollback of the second migration: drop the index and restore the four-kind
  check (possible only while no `account_closure` entry exists). An added enum
  value cannot be removed; it is harmless when unused.

## Verification

- `prisma migrate deploy` applied both migrations to `pilates_dev_sim` and
  `pilates_test_fixtures`; `prisma migrate diff` shows only the drift that
  earlier items already documented (composite foreign keys Prisma cannot
  model), nothing from these two migrations.
- Integration coverage for the ledger check and the unique index arrives with
  the `closeClientAccount` use case.
