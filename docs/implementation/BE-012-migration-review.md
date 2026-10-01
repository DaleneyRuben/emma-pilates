# BE-012 — Email request events migration review

Status: **approved 2026-10-01 under the blanket backlog-decision approval**,
following the [BE-012 proposal](./BE-012-email-source-budgets-proposal.md)
(decision S10).

## Reviewed artifact

- [Migration SQL](./sql/be-012-email-request-events.sql) — committed byte for
  byte as
  `apps/backend/prisma/migrations/20261001000000_authentication_email_request_events/migration.sql`.
  Generated with `prisma migrate diff --from-config-datasource --to-schema prisma
  --script` against the migrated `pilates_dev_sim`; the `DropForeignKey` lines
  the diff lists for the raw composite keys of earlier migrations are drift and
  were stripped (as in every migration since NUT-002).

## Concrete schema impact

| Object | Change | Why |
| --- | --- | --- |
| `system.AuthenticationThrottleEventKind` | `ADD VALUE 'email_requested'` | One row per request admitted by the source budgets, with `purpose` `verification` or `password_recovery`, `client_digest` (nullable) and `network_digest`, `expires_at` 24 hours later (S5, S10) |

No table, column, index, constraint, trigger, or data change. The existing
`(client_digest, occurred_at)` and `(network_digest, occurred_at)` indexes
serve the budget reads; the retention sweep already soft-deletes every
throttle event 30 days after `expires_at`.

## Verification before commit

Run on a disposable `pilates_test_be012` database after every shipped
migration (then dropped):

```text
select 'email_requested'::system."AuthenticationThrottleEventKind"   → ok
insert into system.authentication_throttle_events
  (id, purpose, event_kind, network_digest, occurred_at, expires_at)
  values (…, 'verification', 'email_requested', '\x01', now(), now() + '1 day') → ok
select count(*) … where event_kind = 'message_issued'                → unchanged
```

## Rollout and rollback

- Expand-only and compatible with the running API and worker (ADR-0078): the
  previous release never writes or reads `email_requested` rows. Its own
  migration because a new enum value cannot be used in the transaction that
  adds it.
- Applied locally only to `pilates_test_*` databases (through
  `startDatabaseTestContext`) and `pilates_dev_sim`; `emma_pilates` is not
  touched.
- Rollback: soft-delete or leave the `email_requested` rows (they stop
  counting after 24 hours; the value stays, unused), deploy the previous
  release, then `prisma migrate resolve --rolled-back
  20261001000000_authentication_email_request_events`. PostgreSQL cannot drop
  an enum value.

## Tests that cover it

- `test/database/email-source-budget.integration-spec.ts` (new): admission,
  refusal, lane isolation by purpose, deleted and expired rows, and concurrent
  admission on real PostgreSQL.
- `test/database/foundation-schema.integration-spec.ts` keeps passing (the
  enum gains a value; nothing else changes).
