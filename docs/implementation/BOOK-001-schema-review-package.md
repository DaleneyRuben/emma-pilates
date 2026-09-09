# BOOK-001 — Booking workflow database review

Status: prepared September 9, 2026. These are review artifacts only. They do
not modify the application Prisma schema, create a migration directory, or
apply anything to a database.

Prepared against proposal revision `6bed0ca` and the implemented Booking catalog
migration `20260908000000_booking_catalog`.

## Decision still required

This package makes the approved product rules concrete for review. It does not
authorize creation, testing, or application of a Prisma migration. A later,
explicit approval is required before any of those actions.

## Reviewed artifacts

- [Prisma merge fragment](./prisma/booking-workflow.prisma) — four enums and
  the three proposed models.
- [Review SQL](./sql/booking-workflow-review.sql) — three new tables, their
  ordinary indexes and foreign keys, four enums, and the one nullable Session
  marker.
- [Additional PostgreSQL protections](./sql/booking-workflow-constraints.sql)
  — partial unique indexes, state checks, temporal checks, and composite foreign
  keys Prisma does not express.
- [Review assertions](./sql/booking-workflow-review-test.sql) — representative
  valid rows and rejected database-only cases in one rolled-back transaction.

These are historical review files outside `apps/backend/prisma/migrations/`.
They intentionally do not alter `apps/backend/prisma/models/`.

## Concrete schema impact

| Object | Change | Why it is required |
| --- | --- | --- |
| `booking.sessions` | nullable `empty_booking_check_completed_at` | Preserves the documented one-time two-hour empty-Session decision. |
| `BookingState` | `booked`, `cancelled`, `rescheduled` | One durable Booking state. |
| `BookingCancellationCause` | `client_request`, `session_cancelled` | Separates the business cause from the Account actor. |
| `WaitlistClosureReason` | `left`, `promoted`, `session_cancelled`, `session_started` | Accounts for every terminal Waitlist outcome. |
| `AttendanceOutcome` | `attended`, `no_show` | Supplies the Trainer-recorded reporting result. |
| `booking.bookings` | Client, Session, Subscription, actor, state, cancellation, and Reschedule chain | Preserves reservation and allowance history without an event table. |
| `booking.waitlist_entries` | Client, Session, ordered entry, closure, and promotion link | Maintains the ordered queue without mutable position counters. |
| `booking.attendance_records` | Booking-keyed outcome and Trainer Account actor | Stores one reporting-only Attendance result per Booking. |

There are no drops, backfills, seeds, system tables, notification tables,
job tables, or modifications under `design/`.

## Prisma merge instructions

The fragment is not a standalone schema file. To validate it later, make a
temporary copy of the current application Prisma schema and merge the fragment
with these reverse fields:

| Existing model | Fields to add |
| --- | --- |
| `Client` | `bookings Booking[]`, `waitlistEntries WaitlistEntry[]` |
| `Subscription` | `bookings Booking[]` |
| `Session` | `emptyBookingCheckCompletedAt DateTime? @map("empty_booking_check_completed_at") @db.Timestamptz(3)`, `bookings Booking[]`, `waitlistEntries WaitlistEntry[]` |
| `Account` | `createdBookings Booking[] @relation("BookingCreatedBy")`, `cancelledBookings Booking[] @relation("BookingCancelledBy")`, `rescheduledBookings Booking[] @relation("BookingRescheduledBy")`, `attendanceRecords AttendanceRecord[] @relation("AttendanceRecordedBy")`, `joinedWaitlistEntries WaitlistEntry[] @relation("WaitlistJoinedBy")`, `closedWaitlistEntries WaitlistEntry[] @relation("WaitlistClosedBy")` |

The fragment uses ordinary Prisma foreign-key relations. The review SQL adds
three deliberately redundant-looking composite keys because PostgreSQL needs
them to enforce cross-row identity invariants:

- the Booking's Subscription belongs to its Client;
- a promoted Booking belongs to the same Client and Session as its Waitlist
  Entry; and
- a Reschedule target retains the source Client and Subscription.

## Database-only protections

The SQL keeps database enforcement to rules PostgreSQL can express safely:

- one `booked` Booking and one active Waitlist Entry per Client/Session;
- complete, mutually exclusive Booking and Waitlist terminal fields;
- terminal timestamps no earlier than their originating timestamp;
- exact ownership for Subscription, promotion, and Reschedule links; and
- restrictive history-preserving foreign keys.

Capacity, temporal overlap, complete Attendance submission, live
Booking/Waitlist mutual exclusion, eligibility, authorization, and the
one-time-check workflow remain use-case transaction rules. Their concurrent
behavior is specified in [BOOK-001](./BOOK-001-booking-workflow-schema-proposal.md).

## Review assertions

The assertion script is deliberately protected and rolls back everything. When
separately authorized to run against an isolated database, use only a database
whose name begins `pilates_test_`:

```sh
psql -h 127.0.0.1 -p 55439 -d pilates_test_book_review -X \
  -f docs/implementation/sql/booking-workflow-review-test.sql
```

It installs the already-committed foundation and Booking catalog migrations,
then the review SQL and constraints inside one transaction. It does not invoke
Prisma migration commands, create a migration artifact, or touch a normal
development or production database.

## Migration impact if later approved

A future migration would add the four enums, three `booking` tables, the
Session marker, ordinary indexes, partial unique indexes, checks, restrictive
foreign keys, and the three composite keys. It would take normal table/index and
referenced-table locks while installing constraints. No extension is needed for
this slice because `btree_gist` was installed by the approved catalog migration.

Before migration creation, the merged temporary Prisma schema must validate,
the generated SQL must be compared against these review files, and the
assertions plus real concurrent PostgreSQL integration tests must pass.
