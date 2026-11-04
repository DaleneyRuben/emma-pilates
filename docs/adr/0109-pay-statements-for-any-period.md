# Pay Statements for any period

Status: accepted (2026-11-04); changes the monthly Pay Statement of [ADR-0105](./0105-calculate-staff-pay-in-the-system.md)

While reviewing the admin web's redesign, the owner asked for flexible trainer pay: «Los pagos a instructoras se pueden hacer por día, semana, rango de fechas o mes. Debe ser flexible» (BKO-009). The Coordinator's pay stays monthly (owner, 2026-11-03), because her renewal bonus is measured over a month.

On 2026-11-04 the owner approved the migration and chose option 1, the database exclusion constraint instead of a check in the application: «Si apruebo», then again «Con tu recomendación».

## Decision

- A Trainer's Pay Statement covers a **period**: a start date and an end date (end exclusive, Bolivia civil dates), chosen as a day, a week (Monday to Sunday), a date range, or a month. Sueldos › Por aprobar gets a period picker **Día · Semana · Rango · Mes**; Mes is the default and what the hourly worker keeps drafting.
- The calculation is unchanged: the facts already read Sessions and commissions between two instants (`trainerMonthFacts(from, until)`), so a period is just another window.
- **A class or a commission is never paid twice.** For one Staff Member, two live statements may not overlap, and the database refuses it (below). A draft that loses a race against another draft gets `409 pay_statement_period_overlaps`.
- **Drafting a period, by the Administrator.** For each Trainer with lines in the period, inside one transaction that locks her live statements overlapping it:
  - if any of them is approved, she is skipped: an approved period is never redrafted or overlapped, whether it is the same period or not;
  - otherwise every overlapping draft (a month draft under a day, or days under a month) is withdrawn and the requested period's draft takes its place; a draft of exactly that period with the same lines is left as it is.
- **The hourly worker** drafts the previous and the current whole month. It skips a Trainer for that month when any live statement other than that very month overlaps it, approved or draft, so it never replaces a shorter period the Administrator drafted and never fails on one. A Trainer paid by day, week, or range is therefore drafted only by the Administrator for that month; the days left over are drafted with a range.
- The **Coordinator's** statement keeps whole months: she is drafted only when the period is a whole month, she is listed only when Sueldos shows a whole month, and her statement is approved from seven days after the month ends. A Trainer's statement is approved once its period is over in Bolivia (the same `pay_statement_month_open` code when it is not).
- **Reading.** `GET /v1/administrator/pay-statements` keeps `?month=` and gains `?from=&until=` (civil dates, `until` exclusive, at most 366 days); it returns every live statement the window overlaps, so Día shows a month draft it would replace and an approved month that blocks it. `POST …/draft` takes the same two forms. `PayStatementDto` gains `periodStart` and `periodEnd`; `month` stays in the contract and in the table for the Staff app already released ([ADR-0016](./0016-support-current-and-previous-mobile-releases.md)) and is the first day of the period's month. «Mis pagos» names a statement that is not a whole month by its days.

## Schema

Migration `20261104090000_pay_statement_periods` adds `period_start DATE NOT NULL` and `period_end DATE NOT NULL` to `back_office.pay_statements`, backfilled from `month` (`period_end = month + 1 month`), with a `CHECK` that the period is not empty and that `month` is the first day of the start's month. It replaces the partial unique index `pay_statements_staff_member_month_live_key` with an exclusion constraint on live rows:

```sql
EXCLUDE USING gist (staff_member_id WITH =, daterange(period_start, period_end, '[)') WITH &&)
  WHERE (deleted_at IS NULL)
```

`btree_gist` already exists (`20260908000000_booking_catalog`) and is created again with `IF NOT EXISTS`. Prisma cannot model the constraint, so it lives only in the migration's SQL; `prisma migrate diff` does not report it, so `prisma/known-drift.sql` is unchanged. Nothing is deleted ([ADR-0086](./0086-soft-delete-every-database-row.md)): a withdrawn draft gets `deleted_at` and stops blocking.

## Consequences

- Day, week, and range statements for Trainers are possible without changing how pay is computed, and the guarantee that nothing is paid twice holds in the database even if the application is wrong.
- The worker's monthly draft and the Administrator's shorter periods never fight: once a month holds a shorter period for a Trainer, the worker leaves that Trainer's month to the Administrator.
- Statements are ordered by period in «Mis pagos»; the released Staff app still titles each by its month, so two statements of one month share a title there until the next release.
