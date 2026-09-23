# BKO-001 — Back Office migration review

Status: **approved 2026-09-23 as proposed**, together with the
[BKO-001 proposal](./BKO-001-back-office-schema-proposal.md) (decisions
D1–D20 and the provisional answers to Q1–Q4). This package turns the proposal
into the exact Prisma models and migration SQL BKO-002 adds, in the format of
the [NUT-002](./NUT-002-migration-review.md) and
[ADM-001](./ADM-001-migration-review.md) packages.

## Reviewed artifacts

- [Prisma models](./prisma/back-office.prisma): `Supply`, `Withdrawal`,
  `SupplyRestock`, `SalaryPayment`, `ExpenseCategory`, and `Expense`, to be
  committed as `apps/backend/prisma/models/back-office.prisma`.
- [Generated SQL](./sql/back-office-review.sql): schema, tables, ordinary
  indexes, and foreign keys from `prisma migrate diff`.
- [Database-only protections](./sql/back-office-constraints.sql): checks,
  partial and expression unique indexes, the stock triggers, immutability
  guards, and the provisional Q1 delete guards.
- [Rejection cases](./sql/back-office-review-test.sql): 31 expected failures
  and the valid transitions between them, including a stock reconciliation
  check, inside one rolled-back transaction.

The proposed migration `20260924000000_back_office` is the generated SQL
followed by the protections, byte for byte.

## Concrete schema impact

| Object | Change | Why |
| --- | --- | --- |
| `back_office` schema | created if missing | Listed in `schema.prisma` since the foundation, never created (D1). |
| `back_office.supplies` | new table | Branch-scoped consumable with database-maintained stock (D4, D9). |
| `back_office.withdrawals` | new table | Immutable units-out movement (D6, D7). |
| `back_office.supply_restocks` | new table | Immutable units-in movement (D5). |
| `back_office.salary_payments` | new table | Studio-wide pay record, editable and audited (D10, D17). |
| `back_office.expense_categories` | new table | Unique labels, deletable while unreferenced (D13). |
| `back_office.expenses` | new table | Branch-scoped cost, editable and audited (D11, D17). |
| `Branch`, `StaffMember`, `Account` | reverse Prisma relations only | No column or constraint changes on existing tables. |

There are no drops, backfills, seeds, enums, `system.*` or `booking.*` table
changes, pg-boss queues, or changes under `design/`.

## Prisma merge

The models live in their own file beside the `booking-*.prisma` files.
Reverse fields added to existing models:

| Existing model | Fields |
| --- | --- |
| `Branch` | `supplies Supply[]`, `expenses Expense[]` |
| `StaffMember` | `salaryPayments SalaryPayment[]` |
| `Account` | `createdSupplies` (`SupplyCreatedBy`), `recordedWithdrawals` (`WithdrawalRecordedBy`), `recordedSupplyRestocks` (`SupplyRestockRecordedBy`), `recordedSalaryPayments` (`SalaryPaymentRecordedBy`), `recordedExpenses` (`ExpenseRecordedBy`) |

The two expression unique indexes (`lower(btrim(name))`) are raw SQL, like
`plans_visible_normalized_name_key` and
`class_types_active_normalized_name_key`; Prisma does not model them and does
not try to drop them.

`prisma migrate diff` also lists `DropForeignKey` statements for the ten raw
composite keys earlier migrations added outside Prisma
(`bookings_subscription_client_fkey`,
`payments_purchase_intent_same_client_plan_fkey`, …). That is known drift, not
a change; those lines are removed, as in every earlier migration.

## Database-only protections summary

| Protection | Object | Rejects |
| --- | --- | --- |
| `supplies_values_check` | check | blank name; negative initial quantity, quantity on hand, or threshold |
| `supplies_branch_active_normalized_name_key` | partial unique index | a second active Supply with the same name at one Branch |
| `supplies_protect` | BEFORE INSERT/UPDATE trigger | quantity on hand ≠ initial quantity on insert; changes to Branch, initial quantity, creator, or creation time; a direct quantity change outside a movement trigger; clearing or moving `archived_at` |
| `supplies_reject_delete` | BEFORE DELETE trigger | any delete |
| `withdrawals_quantity_check`, `supply_restocks_quantity_check` | check | zero or negative quantity |
| `withdrawals_apply`, `supply_restocks_apply` | AFTER INSERT trigger | a movement on an archived Supply; a Withdrawal that would take stock below zero (through `supplies_values_check`) |
| `withdrawals_immutable`, `supply_restocks_immutable` | BEFORE UPDATE/DELETE trigger | any update or delete |
| `salary_payments_amount_check`, `expenses_amount_check` | check | zero or negative amount |
| `salary_payments_protect_update`, `expenses_protect_update` | BEFORE UPDATE trigger | changes to the recorder or creation time, or to an Expense's Branch |
| `salary_payments_reject_delete`, `expenses_reject_delete` | BEFORE DELETE trigger | any delete (provisional answer to Q1) |
| `expense_categories_name_check` | check | blank name |
| `expense_categories_normalized_name_key` | unique index | a duplicate name ignoring case and surrounding spaces |
| `expenses_expense_category_id_fkey` (`RESTRICT`) | foreign key | deleting a referenced category |

Trigger errors use SQLSTATE `55000`, like the NUT-002 guards. The quantity
guard allows a change only at trigger depth 2 or more, which is the UPDATE the
movement trigger issues; a direct `UPDATE … SET quantity_on_hand` from the
application runs at depth 1 and is rejected.

### Stock concurrency

A movement is one INSERT. Its AFTER INSERT trigger updates the Supply row,
which takes that row's lock for the rest of the transaction. A second
Withdrawal on the same Supply waits, re-reads the committed quantity (Read
Committed re-evaluates the updated row), and fails `supplies_values_check`
with `23514` if it would go below zero; its own row is never inserted.
BKO-002 maps that error to `409 insufficient_stock`.

### Decisions taken in this review

| # | Decision | Rationale |
| --- | --- | --- |
| R1 | Name uniqueness uses `lower(btrim(name))`, as the catalog does, not `booking.search_text`. | Keeps Back Office free of a dependency on a Booking function. Case folding of non-ASCII letters depends on the database locale: local databases use `C`, where `lower('É')` stays `É`, so "PAPEL HIGIÉNICO" and "Papel higiénico" are distinct there. Plans and Class Types already behave this way; a shared accent-folding rule for every catalog name would be its own change. |
| R2 | No check compares `created_at` or `recorded_at` with anything. | D18: avoids the fixture-clock failure fixed after ADM-001. |
| R3 | The stock triggers do not touch `supplies.updated_at`. | `updated_at` means the Supply's own definition changed; stock history is in the movement rows. |
| R4 | One `apply_supply_movement()` function serves both movement tables, keyed on `TG_TABLE_NAME`. | The two differ only in sign. |

## Verification before commit

On disposable databases (both dropped afterwards):

- `pilates_test_bko001`: every shipped migration applied with
  `prisma migrate deploy`; `prisma validate` passed on a temporary copy of the
  schema with the models and reverse relations merged; `prisma migrate diff
  --from-config-datasource --to-schema <copy> --script` produced the generated
  SQL above. After applying the generated SQL and the protections, the same
  diff reported only the ten known drift `DROP CONSTRAINT` lines.
- Two concurrent sessions each withdrew 6 of 10 units: the second waited on
  the first's row lock, then failed `supplies_values_check`; the Supply ended
  with 4 units and one Withdrawal row.
- `pilates_test_bko001_review` (empty): `psql -f back-office-review-test.sql`
  ran the foundation migration, the generated SQL, the protections, and all 31
  expected failures, ending with "Back Office review checks passed; all
  changes rolled back."

## Rollout and rollback

- Expand-only (ADR-0078): no deployed API or worker reads `back_office`.
- Applied locally only to `pilates_test_*` databases and `pilates_dev_sim`.
- Rollback while empty: `DROP SCHEMA back_office CASCADE;` and
  `prisma migrate resolve --rolled-back 20260924000000_back_office`. Once real
  records exist, recovery is a forward migration.
- If Q1 is answered (b), drop the two `*_reject_delete` triggers on money
  tables from the protections before the migration is created; if (c), add
  `voided_at`, `voided_by_account_id`, and `void_reason` to both tables with an
  all-or-none check, and replace the delete guards with a one-way void guard.

## How BKO-002 will verify it

1. `prisma:validate` passes, and `prisma migrate diff` from the migrated schema
   to the merged models is empty apart from the known drift.
2. `prisma migrate deploy` runs only against disposable `pilates_test_*`
   databases and `pilates_dev_sim`, never `emma_pilates`.
3. `back-office-schema.integration-spec.ts` runs the rejection cases from a
   fixture copy of the review test, and `foundation-schema.integration-spec.ts`
   adds the six tables to the approved-table allowlist.
4. Real PostgreSQL integration specs cover the proposal's test plan, including
   the stock concurrency and idempotency cases.
