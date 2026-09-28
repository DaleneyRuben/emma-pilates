# Soft-delete every database row

Status: accepted

No application table row is ever physically deleted. When something is removed, cancelled, expired, closed, swept for retention, or detached, its row stays and records the removal. Either an existing domain end state already says so (`archived_at`, `ended_at`, `revoked_at`, a cancelled or closed state, the image `deleted` state) or a nullable `deleted_at timestamptz(3)` column does. There are no exceptions for retention sweeps, pending registrations, invitations, email changes, image variants, Branch assignments, or Expense Categories.

Consequences for the schema and the code:

- Production code never issues Prisma `delete` or `deleteMany`, and never runs raw `DELETE` or `TRUNCATE`, against application schemas. An architecture test fails the build if such a call appears under `apps/backend/src`. Integration-spec cleanup of disposable test data is not production code and is not covered by the test.
- Every foreign key between application tables is `ON DELETE RESTRICT`. The existing `CASCADE` and `SET NULL` actions (Account-owned authentication, device, idempotency, notification, and delivery rows, audit actors, suppression resolvers, Staff Branch assignments) become `RESTRICT`, so a stray physical delete fails instead of spreading.
- A unique or exclusion constraint that must not block a new row after an old one was removed applies only to rows that have not been removed. One example is an email reused after a pending registration is cancelled. Another is a Staff Member assigned to a Branch again. Such constraints become partial indexes or constraints with `WHERE deleted_at IS NULL`, or the equivalent end-state predicate.
- Every read of an active collection or a current record excludes removed rows. Retention sweeps (BE-008) mark rows removed instead of deleting them, so the product behaves the same while the history stays.
- Accepted ADRs that say "delete" about database state now mean a soft delete. Uploaded object bytes live in object storage, not the database, so deleting them still follows [ADR-0074](./0074-delete-abandoned-uploads-after-one-day.md), [ADR-0075](./0075-delete-receipt-images-after-forty-five-days.md), and [ADR-0076](./0076-delete-detached-profile-and-promotion-images.md). The asset and variant rows stay with `deleted_at` set.
- Account closure and personal-data removal (BE-007) are designed on top of this rule. They mark removal and stop exposing the data; they never remove rows.

The rule is the studio owner's standing requirement: the database keeps a complete history, and every removal can be traced and, where the product allows it, reversed. Physical deletion for retention was rejected because the owner wants no exceptions. The cost of keeping every row is accepted: tables grow, and queries and indexes must account for removed rows. A database trigger rejecting `DELETE` on every table was considered and not taken now. The architecture test and `RESTRICT` foreign keys catch application mistakes, and a trigger would also block disposable test-data cleanup.

pg-boss's own job tables in the `pgboss` schema are queue infrastructure, not application tables, and are out of scope. pg-boss keeps pruning completed and failed jobs itself ([ADR-0065](./0065-retain-failed-jobs-for-thirty-days.md)), and nothing here changes its configuration. The rule covers the application schemas `system`, `booking`, and `back_office`.
