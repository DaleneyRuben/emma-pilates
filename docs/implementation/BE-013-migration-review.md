# BE-013 — Staff email request events migration review

Status: **awaiting approval** (written 2026-10-01), following the
[BE-013 proposal](./BE-013-staff-email-budgets-proposal.md) (decision T8).
No migration is created or applied until it is approved.

## Reviewed artifacts

- [Enum, column, and index migration SQL](./sql/be-013-staff-email-request-events.sql)
  — to be committed byte for byte as
  `apps/backend/prisma/migrations/20261001000200_authentication_staff_email_request_events/migration.sql`.
  Generated with `prisma migrate diff --from-config-datasource --to-schema
  <prisma with the T8 model change> --script` against the migrated
  `pilates_dev_sim`; the `DropForeignKey` lines the diff lists for the raw
  composite keys of earlier migrations are drift and were stripped (as in
  every migration since NUT-002), and the header comment was added.
- [Check migration SQL](./sql/be-013-staff-email-request-event-check.sql) — to
  be committed byte for byte as
  `apps/backend/prisma/migrations/20261001000300_authentication_staff_email_request_event_check/migration.sql`.
  Hand-written, because Prisma does not model check constraints. A separate
  migration because a new enum value cannot be used in the transaction that
  adds it (as BE-012's two migrations).

The Prisma model change: `AuthenticationThrottleEventKind` gains
`STAFF_EMAIL_REQUESTED @map("staff_email_requested")`;
`AuthenticationThrottleEvent` gains `accountId String? @map("account_id")
@db.Uuid`, the relation `account Account? @relation(fields: [accountId],
references: [id], onDelete: Restrict)`, and `@@index([accountId,
occurredAt])`; `Account` gains the back relation `staffEmailRequests
AuthenticationThrottleEvent[]`.

## Concrete schema impact

| Object | Change | Why |
| --- | --- | --- |
| `system.AuthenticationThrottleEventKind` | `ADD VALUE 'staff_email_requested'` | One row per staff request admitted by the Account budget, with `purpose` `activation` or `verification` (T5, T8) |
| `system.authentication_throttle_events.account_id` | new nullable `uuid`, foreign key to `system.accounts(id)` `ON DELETE RESTRICT ON UPDATE CASCADE` | The budget's key: the signed-in Account (T1). Nullable because no other event kind has one. Accounts are never physically deleted (ADR-0086), so `RESTRICT` never fires |
| index `authentication_throttle_events_account_id_occurred_at_idx` on `(account_id, occurred_at)` | new | Serves the budget read (one Account, the last 24 hours) |
| `authentication_throttle_events_kind_purpose_check` | replaced: the three existing branches each gain `account_id IS NULL`; a fourth admits `staff_email_requested` with purpose `verification` or `activation`, an `account_id`, and no recipient, Login-lane, client, or network digest | A staff event must never count against a recipient, Login, device, or network lane, and no other event may carry an Account |

No table, trigger, or data change. The retention sweep already soft-deletes
every throttle event 30 days after `expires_at`, so it covers the new kind.

## Verification before commit

Run on a disposable `pilates_test_be013` database after both migrations
(then dropped):

```text
select 'staff_email_requested'::system."AuthenticationThrottleEventKind"   → ok
insert (purpose 'activation', kind 'staff_email_requested', account_id <fixture Assistant>) → ok
the same with purpose 'verification'                                       → ok
the same with purpose 'login' or 'password_recovery'                       → check violation
the same without account_id, or with a client, network, or recipient digest → check violation
the same with an account_id that does not exist                             → foreign key violation
an email_requested, message_issued, and failed_credential_check row as before → ok
any of those three with an account_id                                       → check violation
```

## Rollout and rollback

- Expand-only and compatible with the running API and worker (ADR-0078): the
  previous release never writes or reads `staff_email_requested` rows or the
  new column, and its existing rows all satisfy the replaced check (their
  `account_id` is null).
- Applied locally only to `pilates_test_*` databases (through
  `startDatabaseTestContext`) and `pilates_dev_sim`; `emma_pilates` is not
  touched.
- The column is nullable with no default, so adding it is a catalogue-only
  change. The index build and the constraint swap take brief locks and
  validate the existing rows; the table holds at most a few days of throttle
  events plus the 30-day soft-deleted tail.
- Rollback: deploy the previous release (the staff events stop counting after
  24 hours), keep the wider check and the column (the previous release never
  violates or reads them), then `prisma migrate resolve --rolled-back` both
  migrations if they must be reapplied. PostgreSQL cannot drop an enum value;
  it stays, unused.

## Tests that cover it

- `test/database/staff-email-budget.integration-spec.ts` (new): admission,
  refusal, isolation from `email_requested` events and between Accounts,
  deleted and expired rows, and concurrent admission on real PostgreSQL.
- `test/database/email-source-budget.integration-spec.ts` and
  `test/database/foundation-schema.integration-spec.ts` keep passing.
