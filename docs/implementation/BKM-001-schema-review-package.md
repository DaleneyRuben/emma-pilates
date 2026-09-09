# Booking catalog database review

Status: executable proposal, awaiting approval for the application migration.
Prepared against foundation revision `9530c83`.

## What this unlocks

The Client app needs real Plans, Subscription summaries, Promotion cards, and
Session details. The six proposed tables provide that data. Bookings, Payments,
Credits, and Evaluations remain separate slices; adding their columns early would
not make those workflows usable.

The [field-by-field proposal](./BKM-001-booking-membership-schema-proposal.md)
remains the product review. This package makes its database implementation
concrete:

- [Prisma fragment](./prisma/booking-catalog.prisma): the six models and three enums.
- [Generated SQL](./sql/booking-catalog-review.sql): tables, indexes, and foreign keys.
- [Additional constraints](./sql/booking-catalog-constraints.sql): PostgreSQL checks,
  partial unique indexes, and overlap protection Prisma cannot model directly.
- [Executable review assertions](./sql/booking-catalog-review-test.sql): valid
  examples and 40 rejected invalid changes, in a transaction that rolls back.

These files are outside the application's migration directory. The deployed
Prisma schema, generated application client, and development database are unchanged.

## Coverage against the product

| Product requirement | Source | Proposed persistence |
| --- | --- | --- |
| Fixed class allowance, 1/3/6/12 months, BOB centavos | Booking glossary; ADR-0082; Client 08–09 | Plan value checks and integer prices |
| Hidden Plans retain Subscription history | AW04–05; Booking glossary | `hidden_at`, restrictive references, snapshots |
| Session detail describes the Class Type | Client 04; follow-up 39 | Required Class Type description |
| Weekly schedules generate concrete occurrences | ADR-0057/0059; AW02–03; follow-up 39 | ISO weekday, local time, exclusive schedule end, source uniqueness |
| A Branch and Trainer cannot have overlapping Sessions | Booking glossary | Two exclusion constraints; adjacent time ranges are permitted |
| Automatic and Administrator cancellation have different actors | Booking glossary; S13–14 | Cancellation cause, timestamp, actor consistency |
| Only one active Subscription | Booking glossary; Client 12 | Partial unique index per Client |
| Promotional content never changes purchase price | Booking glossary; Client 02; ADR-0007 | Independent Promotion table |
| Draft images stay private; publication needs an image | ADR-0077; AW17–18; follow-up 39 | Publication checks plus later upload/application validation |
| Staff identities and Branch assignments already exist | Foundation schema; separate apps ADR-0085 | References existing records without duplicating identity tables |

Known design discrepancies remain tracked in follow-ups 33–39. Follow-up 40
corrects the standing checklist's reversal of the Cancellation Window wording.
Back Office storage does not change in this slice.

## Concrete examples

All identifiers below are readable aliases for UUIDs, not extra database fields.
These are proposed future application events, not endpoints available today.

| Table | Event that creates a row | Representative stored values |
| --- | --- | --- |
| `plans` | Administrator saves a catalog Plan | `id=plan8`, `name=Paquete de 8 clases`, `duration_months=1`, `class_allowance=8`, `price_centavos=30000`, `display_order=0`, `hidden_at=null` |
| `class_types` | Administrator defines Reformer Pilates | `id=reformer`, `name=Reformer Pilates`, `description=Pilates con Reformer`, `duration_minutes=60`, `default_capacity=8`, `equipment_needs=Reformer`, `archived_at=null` |
| `session_schedules` | Administrator schedules Monday at 09:00 | `id=monday9`, `branch_id=centro`, `class_type_id=reformer`, `trainer_staff_member_id=trainer1`, `weekday=1`, `starts_at_local=09:00`, `capacity=8`, `effective_from=2026-09-01`, `effective_until=null` |
| `sessions` | Reconciler materializes September 14 | `id=session14`, `session_schedule_id=monday9`, `branch_id=centro`, `class_type_id=reformer`, `trainer_staff_member_id=trainer1`, `starts_at=2026-09-14T13:00:00Z`, `ends_at=2026-09-14T14:00:00Z`, `capacity=8`, `state=scheduled`, `is_exception=false`, cancellation fields null |
| `subscriptions` | A Payment confirmation activates Ana's Plan | `id=anaPlan`, `client_id=ana`, `plan_id=plan8`, `plan_name_snapshot=Paquete de 8 clases`, `duration_months_snapshot=1`, original/remaining allowance `8`, `starts_on=2026-01-31`, `ends_on=2026-02-28`, `state=active`, `activated_at=2026-01-31T16:00:00Z`, `expired_at=null` |
| `promotions` | Administrator saves an announcement draft | `id=announcement`, `headline=Conoce el estudio`, `description=Te esperamos`, `image_asset_id=null`, display dates `2026-09-01` through `2026-09-30`, `display_order=0`, `published_at=null`, `archived_at=null` |

Every row also has its `created_at` and `updated_at` timestamps. Later hiding
`plan8` does not change Ana's snapshot. Publishing `announcement` requires an
eligible finalized image and sets `published_at`. Cancelling `session14`
automatically sets cause `zero_bookings`, sets `cancelled_at`, and leaves the
actor null; an Administrator cancellation uses `no_substitute_trainer` and the
Administrator's Account ID.

## Rules deliberately left to the application

Foreign keys establish that records exist; they do not authorize actions. The
repository/use-case tests in BKM-002 and later slices must enforce Trainer Role
and Branch assignment, Administrator-only cancellation, active catalog records,
and image purpose, ownership, processing state, and publication cleanup.

The SQL test uses an existing Account merely to exercise the cancellation foreign
key; it does not prove that this Account has Administrator permission. It also
uses image metadata to exercise reference integrity, not upload finalization.

Subscription calendar calculation, early expiration with zero allowance,
preservation of booked occurrences, and concurrent materialization are not
implemented by these review files. A changed generated occurrence must not be
recreated at its old time; the reconciler must account for exceptions when it
uses source/start uniqueness. Cover that scenario when materialization is built.

## Reproduce the review

Use a fresh, isolated PostgreSQL database named `pilates_test_*`, never the
normal development database. From the repository root:

```sh
psql -h 127.0.0.1 -p 55439 -d pilates_test_bkm_review -X \
  -f docs/implementation/sql/booking-catalog-review-test.sql
```

The script installs the existing foundation and the proposed catalog inside one
transaction. Any failed assertion aborts the connection transaction; a successful
run explicitly rolls back. It does not invoke Prisma migrations or pg-boss.

For Prisma validation, copy the current `schema.prisma`, `models/booking.prisma`,
and `models/system.prisma` into a temporary schema directory, then include the
review fragment. Add these reverse relation fields to the copied foundation:

| Existing model | Fields to add |
| --- | --- |
| Client | `subscriptions Subscription[]` |
| StaffMember | `schedules SessionSchedule[]`, `sessions Session[]` |
| Branch | `schedules SessionSchedule[]`, `sessions Session[]` |
| Account | `cancelledSessions Session[]` |
| ImageAsset | `promotions Promotion[]` |

Run `prisma validate --schema <temporary-schema-directory>`, then regenerate the
base review SQL with `prisma migrate diff --from-schema prisma --to-schema
<temporary-schema-directory> --script` from `apps/backend`. The additional
constraints stay in their separate reviewed SQL file.

## Verification and limits

On September 8, 2026, Prisma 7.10 validated the combined temporary schema. The
first database run failed because a two-month Plan was accepted without the
additional constraints. After those constraints were added, all 40 rejection
assertions and the valid lifecycle examples passed on isolated PostgreSQL 14.18.

The project's Testcontainers baseline is PostgreSQL 17. BKM-002 must also run
the resulting migration and repository/concurrency suite on that version before
completion. This review does not claim PostgreSQL 17, API, or iOS validation.

## Migration impact and approval

The future migration combines the generated SQL with the additional constraints:
six new `booking` tables, three enums, indexes, foreign keys, and `btree_gist`.
There are no drops, backfills, existing-column changes, seeds, or new system
tables. Installing the extension requires database permission. Foreign-key
creation takes locks on referenced foundation tables during the migration.

Approval requested: accept these six models and the two SQL files for BKM-002,
including creating the application migration and testing it on disposable
databases. Applying it to the user's development database or production remains
a separate operational action. The review files alone add no mobile feature.
