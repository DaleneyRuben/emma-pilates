# BE-011 — Soft-delete migration review

Status: **approved 2026-09-28**. The owner settled the pg-boss question and
the rest was approved under the blanket backlog-decision approval ([ADR-0086](../adr/0086-soft-delete-every-database-row.md)).

The red architecture spec `src/architecture/soft-delete-only.spec.ts`
(`b4a89c0`) lists the 16 physical deletes this item removes. This review
covers the one expand migration they need.

## Physical deletes and their replacements

| Site | Deletes today | Becomes |
| --- | --- | --- |
| `retention/prisma-retention-sweeps.ts` | expired idempotency records, expired or revoked Authentication Sessions, old throttle events, old read notifications | `UPDATE … SET deleted_at = now()` on the same cutoffs, skipping rows already marked |
| `registration/prisma-client-registration-unit-of-work.ts` (×5) | a pending Account with its Client or Staff Member when a pending registration is cancelled, corrected, or expires | `deleted_at` on the Account and on its Client or Staff Member |
| `invitations/prisma-client-invitation-unit-of-work.ts` (×2) | an invited pending Account and Client on cancellation | same as registration |
| `email-change/prisma-email-change-gateway.ts` (×2) | the pending email change on completion or cancellation | `deleted_at` on the change row |
| `uploads/prisma-upload-commands.ts` | image variant rows when an asset is detached | `deleted_at` (the column exists); the object bytes are still erased (ADR-0076) |
| `staff/prisma-staff-management.ts` | Staff Branch assignments no longer in the new set | `deleted_at` on those assignments; re-adding a Branch inserts a new row |
| `expenses/prisma-expenses.ts` | an unused Expense Category | `deleted_at`; a category that active Expenses use is still refused `409 expense_category_in_use`, now through an explicit check because `RESTRICT` no longer fires |

## Concrete schema impact

| Object | Change | Why |
| --- | --- | --- |
| `system.accounts` | `+ deleted_at timestamptz(3)`; `accounts_email_key` becomes a partial unique index `WHERE deleted_at IS NULL` | A removed pending Account must not block registering the same email again |
| `booking.clients`, `booking.staff_members` | `+ deleted_at` | Removed with their pending Account |
| `system.account_email_changes` | `+ id uuid` primary key (backfilled), `+ deleted_at`; `account_id` becomes a partial unique index `WHERE deleted_at IS NULL` | Keeps one pending change per Account while keeping earlier ones |
| `booking.staff_branch_assignments` | `+ id uuid` primary key (backfilled), `+ deleted_at`; `(staff_member_id, branch_id)` becomes a partial unique index `WHERE deleted_at IS NULL` | A removed assignment stays; the Branch can be assigned again |
| `system.idempotency_records` | `+ deleted_at`; `(account_id, command, idempotency_key)` becomes partial `WHERE deleted_at IS NULL` | Keeps today's behavior: a key retried after the sweep counts as a new command |
| `system.authentication_sessions`, `system.authentication_throttle_events`, `system.notifications`, `back_office.expense_categories` | `+ deleted_at` | Marked by the sweeps and by category removal |
| `system.notifications` unique `(account_id, business_event_key)` | **unchanged (full)** | A swept notification still dedupes its business event, so a replayed event never shows up again |
| 12 foreign keys: tokens, sessions (Account and device), idempotency, notifications, devices, email changes (Account and token) → `accounts`; deliveries → `notifications`; assignments → `staff_members`; audit actor and suppression resolver → `accounts` | `CASCADE` / `SET NULL` → `RESTRICT` | A stray physical delete fails instead of spreading (ADR-0086) |

The partial unique indexes are raw SQL in the migration, like the existing
exclusion constraints. In the Prisma schema they are not declared unique, so
`findUnique` on `email`, `accountId`, or the assignment pair becomes
`findFirst` with `deletedAt: null`.

Existing domain end states stay as they are and gain no `deleted_at`:
`authentication_tokens.invalidated_at`/`used_at`,
`account_devices.deactivated_at`, the image asset `deleted` state,
`archived_at` on Plans, Class Types, Branches, and Supplies, and
`availability_blocks.ended_at`.

## Read-side rule

Every read of an active record or collection on the tables above filters
`deleted_at IS NULL`. The biggest group is the Branch-scope reads over
`staff_branch_assignments` (principal Branch scope, directory, Trainer and
Nutritionist pickers). Session, throttle, and idempotency reads already filter
by expiry, so a swept row is already inert; they gain the filter anyway. The
notification inbox and unread count must gain it, because they list read
notifications.

## Rollout and rollback

- There is no production deployment yet, so the renamed primary keys and the
  `findUnique` → `findFirst` changes land together with the code. On
  `pilates_dev_sim` the migration backfills `id` with `gen_random_uuid()`.
- Rollback: restore the composite and `account_id` primary keys and the full
  unique indexes (this fails if soft-deleted duplicates exist, which is
  expected), drop the new columns, then run
  `prisma migrate resolve --rolled-back`.

## Implementation slices (each red → green)

1. Migration and schema, with a real-PostgreSQL spec for the partial
   uniqueness and `RESTRICT` behavior.
2. Retention sweeps and the notification inbox filter.
3. Pending registration and invitation removal, and the email reuse check.
4. Email-change completion and cancellation.
5. Staff Branch assignment replacement and every Branch-scope read.
6. Image variant detach and Expense Category removal; the architecture spec
   turns green.

## pg-boss (decided)

The owner decided on 2026-09-28 that pg-boss's own `pgboss` job tables are out of scope. pg-boss keeps pruning them as configured (ADR-0065), and this migration does not touch them.
