# IDN-008 — Email change migration review

Status: **approved 2026-09-24 under the blanket backlog-decision approval**,
following the [IDN-008 proposal](./IDN-008-email-change-proposal.md)
(decisions E1–E14).

## Reviewed artifact

- [Migration SQL](./sql/idn-008-account-email-change.sql) — committed byte for
  byte as
  `apps/backend/prisma/migrations/20260925000000_account_email_change/migration.sql`.
  Generated with `prisma migrate diff --from-config-datasource --to-schema prisma
  --script` against the migrated `pilates_dev_sim`; the `DropForeignKey` lines
  the diff lists for the raw composite keys of earlier migrations are drift and
  were stripped (as in every migration since NUT-002).

## Concrete schema impact

| Object | Change | Why |
| --- | --- | --- |
| `system.AuthenticationTokenPurpose` | `ADD VALUE 'email_change'` | The Verification Link sent to the new address (E2) |
| `system.account_email_changes` | new table: `account_id uuid` PK → `accounts` cascade; `new_email text`; `authentication_token_id uuid` unique → `authentication_tokens` cascade; `requested_at`, `expires_at timestamptz(3)` | One pending change per Account (E5); removed with its token by completion, cancellation, or the retention sweep |

No column, constraint, trigger, or data changes on existing tables.

## Verification before commit

Run on a disposable `pilates_test_idn008` database after every shipped
migration (then dropped):

```text
insert into system.account_email_changes … (account A, token T1)     → ok
insert … (account A, token T2)                                        → duplicate key (account_email_changes_pkey)
insert … (account B, token T1)                                        → duplicate key (…_authentication_token_id_key)
delete from system.authentication_tokens where id = T1                → the change row disappears (cascade)
select 'email_change'::system."AuthenticationTokenPurpose"            → ok
```

## Rollout and rollback

- Expand-only and compatible with the running API and worker (ADR-0078): the
  previous release never issues `email_change` tokens and never reads the
  table.
- Applied locally only to `pilates_test_*` databases (through
  `startDatabaseTestContext`) and `pilates_dev_sim`; `emma_pilates` is not
  touched.
- Rollback: `DROP TABLE system.account_email_changes;` (the enum value stays,
  unused), then `prisma migrate resolve --rolled-back
  20260925000000_account_email_change`.

## Tests that cover it

- `test/database/account-email-change.integration-spec.ts` (new): request,
  replace, resend, cancel, complete, the neutral in-use answer, the throttle,
  and the password-change cancellation, on real PostgreSQL.
- `test/database/foundation-schema.integration-spec.ts` keeps passing (the
  enum gains a value; nothing else changes).
