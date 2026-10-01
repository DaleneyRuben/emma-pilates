# BE-012 — Email request events migration review

Status: **approved 2026-10-01 under the blanket backlog-decision approval**,
following the [BE-012 proposal](./BE-012-email-source-budgets-proposal.md)
(decision S10).

## Reviewed artifacts

- [Enum migration SQL](./sql/be-012-email-request-events.sql) — committed byte
  for byte as
  `apps/backend/prisma/migrations/20261001000000_authentication_email_request_events/migration.sql`.
  Generated with `prisma migrate diff --from-config-datasource --to-schema prisma
  --script` against the migrated `pilates_dev_sim`; the `DropForeignKey` lines
  the diff lists for the raw composite keys of earlier migrations are drift and
  were stripped (as in every migration since NUT-002).
- [Check migration SQL](./sql/be-012-email-request-event-check.sql) — committed
  byte for byte as
  `apps/backend/prisma/migrations/20261001000100_authentication_email_request_event_check/migration.sql`.
  Hand-written, because Prisma does not model check constraints: the first
  verification run showed the foundation schema's
  `authentication_throttle_events_kind_purpose_check` admits only
  `failed_credential_check` and `message_issued`, so the new kind needs its own
  branch. It is a separate migration because a new enum value cannot be used in
  the transaction that adds it (as BE-007's two closure migrations).

## Concrete schema impact

| Object | Change | Why |
| --- | --- | --- |
| `system.AuthenticationThrottleEventKind` | `ADD VALUE 'email_requested'` | One row per request admitted by the source budgets, with `purpose` `verification` or `password_recovery`, `client_digest` (nullable) and `network_digest`, `expires_at` 24 hours later (S5, S10) |

| `authentication_throttle_events_kind_purpose_check` | replaced with the same two branches plus `email_requested` with purpose `verification` or `password_recovery`, a `network_digest`, and no `recipient_digest` or `login_lane_digest` | The network address is always known, the client identifier may be missing (S7), and a source event must never count against a recipient lane or a Login lane |

No table, column, index, trigger, or data change. The existing
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
the same with client_digest '\x02' as well                             → ok
the same with purpose 'login' or 'activation'                         → check violation
the same with recipient_digest '\x03' or without network_digest       → check violation
a message_issued and a failed_credential_check row as before          → ok
```

## Rollout and rollback

- Expand-only and compatible with the running API and worker (ADR-0078): the
  previous release never writes or reads `email_requested` rows. Its own
  migration because a new enum value cannot be used in the transaction that
  adds it.
- Applied locally only to `pilates_test_*` databases (through
  `startDatabaseTestContext`) and `pilates_dev_sim`; `emma_pilates` is not
  touched.
- The constraint swap takes a brief `ACCESS EXCLUSIVE` lock and validates the
  existing rows, which all match the unchanged first two branches; the table
  holds at most a few days of throttle events.
- Rollback: deploy the previous release (the
  `email_requested` rows stop counting after 24 hours), restore the two-branch
  check only once no `email_requested` row is left un-swept (or keep the wider
  check, which the previous release never violates), then `prisma migrate
  resolve --rolled-back` both migrations. PostgreSQL cannot drop an enum value;
  it stays, unused.

## Tests that cover it

- `test/database/email-source-budget.integration-spec.ts` (new): admission,
  refusal, lane isolation by purpose, deleted and expired rows, and concurrent
  admission on real PostgreSQL.
- `test/database/foundation-schema.integration-spec.ts` keeps passing (the
  enum gains a value; nothing else changes).
