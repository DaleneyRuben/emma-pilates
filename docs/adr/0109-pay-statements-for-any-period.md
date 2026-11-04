# Pay Statements for any period

Status: proposed (2026-11-03); changes the monthly Pay Statement of [ADR-0105](./0105-calculate-staff-pay-in-the-system.md); the schema change waits for the owner's migration approval

While reviewing the admin web's redesign, the owner asked for flexible trainer pay: «Los pagos a instructoras se pueden hacer por día, semana, rango de fechas o mes. Debe ser flexible» (BKO-009). The Coordinator's pay stays monthly (owner, 2026-11-03), because her renewal bonus is measured over a month.

## Decision

- A Trainer's Pay Statement covers a **period**: a start date and an end date (end exclusive, Bolivia civil dates), chosen as a day, a week, a date range, or a month. Sueldos › Por aprobar gets a period picker **Día · Semana · Rango · Mes**; Mes is the default and what the hourly worker keeps drafting.
- The calculation is unchanged: the facts already read Sessions and commissions between two instants (`trainerMonthFacts(from, until)`), so a period is just another window.
- **A class or a commission is never paid twice.** For one Staff Member, two live statements may not overlap. The backend checks it in the same transaction that drafts or approves a statement and answers `409 pay_statement_period_overlaps` with the overlapping period. A draft that overlaps an approved period is never created. The worker's monthly draft skips any Trainer who already has an approved statement inside that month and drafts only the days left uncovered.
- The **Coordinator's** statement keeps whole months and the existing rule that it is approved from seven days after the month ends.
- The read stays compatible: `month` remains in the contract and in the table for the Staff app already released ([ADR-0016](./0016-support-current-and-previous-mobile-releases.md)), and new `periodStart`/`periodEnd` fields are added beside it.

## Schema (needs the owner's approval before it is written)

Add `period_start DATE` and `period_end DATE` to `back_office.pay_statements`, backfilled from `month` (`period_end = month + 1 month`), and replace the partial unique index on `(staff_member_id, month)` with a plain index on `(staff_member_id, period_start)`; the no-overlap rule moves to the application transaction above instead of a `btree_gist` exclusion constraint, so no extension is added. Nothing is deleted ([ADR-0086](./0086-soft-delete-every-database-row.md)).

## Consequences

- Day, week, and range statements for Trainers become possible without changing how pay is computed.
- Overlap is guarded in one transaction per Staff Member, so two Administrators drafting at once serialize on that Staff Member's statements.
- Until the migration is approved and applied, Sueldos keeps the month picker only.
