# Booking catalog persistence

Completed September 8, 2026 after schema approval `46140dc`.

## Delivered

- Migration `20260908000000_booking_catalog`: six approved tables, three enums,
  restrictive references, checks, partial unique indexes, and `btree_gist`
  overlap protections. Implementation: `2fa845b`.
- Booking-owned repository reads for Plans, Class Types, Session Schedules,
  Sessions, Subscriptions, and Promotion metadata. The plain interface has no
  Prisma/NestJS dependencies; queries select explicit fields. Implementation:
  `45946a1`.
- Real overlapping-transaction tests verify PostgreSQL blocking, the losing
  constraint, and the surviving row count. Evidence: `8bfaf4f`.

The migration combines the two approved SQL files. No seeds, backfills, drops,
or changes to existing columns were introduced. The schema and repository tests
failed before implementation and passed afterward, with separate red/green commits.

## Verification

Tests used isolated PostgreSQL **17.10** on port 55440. The existing foundation
was upgraded in `pilates_test_bkm002`; a fresh installation of all four migrations
passed in `pilates_test_bkm002_full`. Both databases are disposable. The user's
normal development database was not migrated.

| Check | Result |
| --- | --- |
| Prisma validation/client generation | Passed |
| Backend lint, type checking, build | Passed |
| Unit suite | 31 suites, 99 tests passed |
| Database integration suite | 9 suites, 32 tests passed |
| Approved SQL rejection cases | All 40 passed within the integration suite |
| Concurrent writes | Branch overlap, Trainer overlap, active Subscription uniqueness, source occurrence uniqueness passed |
| HTTP end-to-end suite | 4 suites, 23 tests passed |
| OpenAPI/client regeneration | Passed; no contract changes |
| Migration status | Four applied; up to date |

HTTP tests initially could not open sandboxed local listeners; they passed with
listener permission and the disposable database URL. Jest emits its existing
experimental VM-modules warning. This persistence-only slice did not require
iOS testing and introduces no mobile or API changes.

With Docker available, repeat database checks with
`pnpm --filter @pilates/backend test:integration`. The existing Testcontainers
helper uses PostgreSQL 17. Alternatively set `TEST_DATABASE_URL` to a dedicated
PostgreSQL 17 database named `pilates_test_*`. The command applies migrations;
never target a normal development or production database.

## Boundaries for the next slice

Wire the repository privately into the Booking module when API-001 introduces
the first consuming use cases. Application code consumes `CatalogRepository`,
not Prisma or the adapter. No repository is exported to another context.

Date-only arguments represent Bolivia civil dates at UTC midnight; derive them
in `America/La_Paz`, not the device zone. Session queries use a start-inclusive,
end-exclusive instant range and explicit result limit. API-001 owns runtime
validation, pagination, authentication, and selection of the authenticated
Client ID for Subscription reads.

This slice adds reads, not write commands. Payment activation, expiration,
recurring materialization, cancellation, and upload/publication remain separate:

- Zero allowance alone does not make the reader discard an active Subscription;
  future Bookings may keep it active under the accepted rule.
- Promotion reads return an Image Asset ID, never private keys or URLs. UPL-001
  and publication must enforce finalized image purpose/ownership and public
  variants before API delivery.
- Foreign keys do not authorize Trainers, Branch assignments, or Administrator
  cancellation. Later write use cases must enforce these checks and their
  transaction/retry policies.

Next: **UPL-001**, then fixtures and discovery APIs, followed by Client Home and
Session browsing. No new mobile feature is visible from BKM-002 alone.
Nothing under `design/` was changed.
