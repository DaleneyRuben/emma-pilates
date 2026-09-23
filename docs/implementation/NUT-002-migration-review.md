# NUT-002 — Nutritionist evaluation migration review

Status: **approved 2026-09-22 under the blanket backlog-decision approval**
(the user approved PAY-002's recommended options and delegated the remaining
backlog decisions on 2026-09-22, and asked for NUT-002 to follow the approved
[NUT-001 proposal](./NUT-001-nutritionist-evaluation-schema-proposal.md)'s
rollout order). This package turns the proposal's reviewable SQL into the exact
Prisma model text and migration SQL NUT-002 adds, in the format of the
[BOOK-001](./BOOK-001-schema-review-package.md) and
[PAY-002](./PAY-002-migration-review.md) review packages. Decisions D1–D18 of
the proposal are settled; the few choices the proposal left open are recorded
[below](#decisions-taken-in-this-review).

## Reviewed artifacts

- [Prisma models](./prisma/nutritionist-evaluations.prisma) — three enums and
  the `AvailabilityBlock`, `EvaluationSlot`, and `Evaluation` models, committed
  as `apps/backend/prisma/models/booking-evaluations.prisma`.
- [Generated SQL](./sql/nutritionist-evaluations-review.sql) — enums, tables,
  ordinary and unique indexes, and foreign keys from `prisma migrate diff`.
- [Database-only protections](./sql/nutritionist-evaluations-constraints.sql) —
  checks, exclusion constraints, partial unique indexes, immutability triggers,
  and the two cross-table guards Prisma cannot express.
- Rejection cases —
  `apps/backend/test/database/fixtures/nutritionist-evaluations-constraints.sql`
  (32 expected failures plus the valid transitions between them) run by
  `nutritionist-evaluations-schema.integration-spec.ts` inside one rolled-back
  transaction.

The migration `20260922010000_nutritionist_evaluations` is the generated SQL
followed by the protections, byte for byte.

## Concrete schema impact

| Object | Change | Why it is required |
| --- | --- | --- |
| `EvaluationSlotState` | `published`, `withdrawn` | A slot is never deleted or moved; a block change withdraws it once. |
| `EvaluationState` | `booked`, `cancelled` | D12: no Attendance, Waitlist, or Reschedule. |
| `EvaluationCancellationCause` | `client_request`, `staff_cancelled` | D14 separates the Client's cancellation from the studio's. |
| `booking.availability_blocks` | new table | Weekly Branch-scoped range with an inclusive/exclusive effective range. |
| `booking.evaluation_slots` | new table | Materialized 45-minute occurrences with exact instants and the Bolivia month. |
| `booking.evaluations` | new table | One Client's reservation, its month key, Subscription evidence, cancellation, and reminder markers. |
| `StaffMember`, `Branch`, `Client`, `Subscription`, `Account` | reverse Prisma relations only | No column or constraint changes on existing tables. |

There are no drops, backfills, seeds, `system.*` tables, pg-boss queues, or
changes under `design/`.

## Prisma merge

The models live in their own file beside `booking-workflow.prisma` and
`booking-payments.prisma`. Reverse fields added to existing models:

| Existing model | Fields |
| --- | --- |
| `StaffMember` | `availabilityBlocks AvailabilityBlock[]`, `evaluationSlots EvaluationSlot[]` |
| `Branch` | `availabilityBlocks AvailabilityBlock[]`, `evaluationSlots EvaluationSlot[]` |
| `Client` | `evaluations Evaluation[]` |
| `Subscription` | `evaluations Evaluation[]` |
| `Account` | `createdAvailabilityBlocks`, `endedAvailabilityBlocks`, `createdEvaluations`, `cancelledEvaluations` (named relations) |

Composite relations are ordinary Prisma relations with explicit constraint
names so the proposal's names survive:

- `evaluation_slots_block_fkey` — `(availability_block_id,
  nutritionist_staff_member_id, branch_id)` → the block's matching unique key,
  so a slot's copied Nutritionist and Branch always equal its source block's;
- `evaluations_slot_month_fkey` — `(evaluation_slot_id, eligibility_month)` →
  `evaluation_slots (id, local_month)`, so the month key is the slot's; and
- `evaluations_subscription_client_fkey` — `(subscription_id, client_id)` →
  `subscriptions (id, client_id)`, so the evidence Subscription is the Client's.

Prisma emits `ON UPDATE CASCADE` on these keys as on every existing one; the
identifiers they cover are trigger-immutable, so the cascade never fires.

`prisma migrate diff` also lists `DropForeignKey` statements for the raw
composite keys earlier migrations added outside Prisma
(`bookings_subscription_client_fkey`, `payments_purchase_intent_same_client_plan_fkey`,
…). That is known drift from raw SQL, not a change; those lines are removed, as
in every earlier migration.

## Database-only protections summary

- **Blocks**: ISO weekday; start before end; at least 45 minutes; both ends on
  the 15-minute grid with zero seconds; `effective_until >= effective_from`;
  the three end fields all set or all null; no overlapping weekly range for one
  Nutritionist on the same weekday at any Branch (`EXCLUDE USING gist`, empty
  ranges overlap nothing); definition immutable; never deleted.
- **Slots**: exactly 45 minutes; `local_month` is the `America/La_Paz` month of
  `starts_at`; withdrawal evidence matches the state; no two published slots of
  one Nutritionist overlap (partial exclusion); unique `(block, starts_at)` for
  idempotent materialization; occurrence immutable; `published → withdrawn`
  once; never withdrawn while a booked Evaluation holds it; never deleted.
- **Evaluations**: month key is a first-of-month date copied from the slot; the
  Subscription belongs to the Client; cancellation fields complete exactly when
  cancelled; one booked Evaluation per slot and per Client per month (partial
  unique indexes); a booked row may only be inserted against a published slot;
  reservation immutable; `booked → cancelled` once; each reminder marker set
  once; never deleted.

Authorization, the 3-hour booking and cancellation windows, Subscription
eligibility, the 30-day horizon, Branch assignment, notifications, audit, and
idempotency remain use-case rules, as the proposal states.

### Cross-table guard concurrency

`assert_evaluation_slot_published` reads the slot `FOR SHARE`, and a withdrawal
`UPDATE` holds the slot's row lock while its `BEFORE` trigger checks for booked
Evaluations. Under READ COMMITTED whichever statement locks first wins and the
other sees its committed result; under the commands' SERIALIZABLE transactions a
conflict surfaces as a retryable serialization failure. The triggers are the
last resort behind the use cases' `FOR UPDATE` lock order, never the primary
rule.

## Decisions taken in this review

Taken under the 2026-09-22 blanket approval, because the proposal left them
open:

| # | Decision | Rationale |
| --- | --- | --- |
| R1 | The block trigger lets `effective_until` be **set once or moved earlier**, never later and never back to null; `ended_at`/`ended_by_account_id` record the latest end. | The proposal allows replacing or ending a block that already has a future end (`D < effective_until`), which shortens that end. Extending a block's end would republish withdrawn slots, which D15 rules out. |
| R2 | Stable error codes use **snake_case** (`evaluation_slot_unavailable`, `availability_block_overlap`, …). | PAY-002 decision (c): every existing endpoint uses snake_case. |
| R3 | Migration name `20260922010000_nutritionist_evaluations`. | Sorts after `20260922000000_payments`, like `20260830010000`. |
| R4 | No new pg-boss queue in this migration. | See the implementation note below; the reconcilers need no schema. |

### Implementation note on jobs

The proposal sketches the reconcilers as pg-boss schedules that enqueue
per-block and per-reminder jobs. The installed pg-boss runs with
`schedule: false`, and every existing reconciler (renewal reminders, Purchase
Intent expiry, pending-Account and upload cleanup) is a worker interval that
calls a use case directly. NUT-002 follows that established shape: an hourly
slot reconciler (plus one run at worker start) materializes each intersecting
block in its own serializable transaction, and a one-minute reminder sweep
records each due reminder and its marker in one transaction. The idempotency
guards are unchanged — the unique source/start index and published-slot
exclusion for materialization, and the markers plus
`(account_id, business_event_key)` for reminders — so duplicate or overlapping
runs are no-ops. A reminder is at most one sweep late, well inside the D18
windows. Queue-backed fan-out can replace the loops later without a schema
change to these tables.

## How it is verified

1. `pnpm --filter @pilates/backend prisma:validate` passes, and
   `prisma migrate diff` from the migrated schema to the merged models is empty
   apart from the known raw-key drift.
2. `prisma migrate deploy` runs only against disposable `pilates_test_*`
   databases (through `TEST_DATABASE_URL`) and, for the curl smoke, the local
   `pilates_dev_sim` database — never `emma_pilates`, shared development, or
   production.
3. `nutritionist-evaluations-schema.integration-spec.ts` runs the rejection
   fixture, and `foundation-schema.integration-spec.ts` lists the three new
   tables in the approved-table allowlist.
4. Real PostgreSQL integration specs cover materialization, block
   replace/end, booking, cancellation, reminders, and the concurrency cases in
   the proposal's test plan.
