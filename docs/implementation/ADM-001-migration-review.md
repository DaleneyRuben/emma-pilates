# ADM-001 — Session occurrence migration review

Status: **approved 2026-09-23 under the blanket backlog-decision approval**,
following the [ADM-001 proposal](./ADM-001-admin-api-proposal.md) (decisions
C1–C3; slices A, B, D, and E need no schema change).

## Reviewed artifacts

- [`adm-001-schedule-changed-cause.sql`](./sql/adm-001-schedule-changed-cause.sql)
  → migration `20260923010000_session_schedule_changed_cause`
- [`adm-001-session-occurrences.sql`](./sql/adm-001-session-occurrences.sql)
  → migration `20260923010100_session_occurrences`
- Prisma: `Session.occurrenceStartsAt DateTime? @map("occurrence_starts_at")
  @db.Timestamptz(3)`, `@@unique([sessionScheduleId, occurrenceStartsAt])`
  replacing `@@unique([sessionScheduleId, startsAt])`, and
  `SessionCancellationCause.SCHEDULE_CHANGED @map("schedule_changed")` in
  `prisma/models/booking-catalog.prisma`.

Both migrations are hand-written and committed byte for byte from the SQL
above. After applying them, `prisma migrate diff --from-config-datasource
--to-schema prisma` reports no difference other than the known composite
foreign-key drift, which no migration includes.

## Concrete schema impact

| Object | Change |
| --- | --- |
| `booking."SessionCancellationCause"` | `+ 'schedule_changed'` |
| `booking.sessions.occurrence_starts_at` | new nullable `timestamptz(3)`, backfilled from `starts_at` for generated rows |
| `booking.default_session_occurrence()` + `sessions_default_occurrence` | `BEFORE INSERT` trigger filling the occurrence for generated rows that omit it |
| `sessions_occurrence_check` | occurrence present exactly for generated rows |
| `sessions_session_schedule_id_starts_at_key` | dropped |
| `sessions_session_schedule_id_occurrence_starts_at_key` | new unique index |
| `sessions_cancellation_check` | `schedule_changed`, like `no_substitute_trainer`, requires an actor |

## Verification before commit

On a disposable `pilates_test_adm001` database with every shipped migration
and the development fixtures (then dropped):

- backfill: 70 of 70 generated Sessions got `occurrence_starts_at = starts_at`;
- an insert that omits the column (the previous worker) is accepted and filled
  by the trigger;
- moving a generated Session's `starts_at` leaves its occurrence unchanged;
- `schedule_changed` without an actor is rejected by the widened check.

## Rollout and rollback

- Expand-only (ADR-0078): the previous API and worker keep working. The
  previous fixtures code upserted on the old unique key, so development
  fixtures ship with the change.
- Applied locally only to `pilates_test_*` databases and `pilates_dev_sim`.
- Rollback of the second migration: restore the old check, drop the new index,
  recreate `sessions_session_schedule_id_starts_at_key` (possible only while no
  two generated Sessions of one schedule share a start), drop the trigger,
  function, check, and column. An added enum value cannot be removed; it is
  harmless if unused.

## Tests that cover it

- Session reconciler integration: rerunning after a moved Session creates no
  new row at the original start.
- ADM-001 Session edit and schedule replacement integration cases, including
  the `schedule_changed` cancellations and the cleared empty-check marker.
