# STAFF-004 — Accent-insensitive search migration review

Status: **approved 2026-09-23 under the blanket backlog-decision approval**,
following the [STAFF-004 proposal](./STAFF-004-accent-insensitive-search-proposal.md)
(decisions S1–S5).

## Reviewed artifact

- [Migration SQL](./sql/staff-004-accent-insensitive-search.sql) — committed
  byte for byte as
  `apps/backend/prisma/migrations/20260923000000_accent_insensitive_client_search/migration.sql`.
  Hand-written: `schema.prisma` does not change, so `prisma migrate diff`
  produces nothing to strip.

## Concrete schema impact

| Object | Change | Why |
| --- | --- | --- |
| `unaccent` (public) | extension created if missing | Accent folding (S1) |
| `pg_trgm` (public) | extension created if missing | Contains matching through an index (S1, S3) |
| `booking.search_text(text)` | new `IMMUTABLE STRICT PARALLEL SAFE` SQL function | Index-safe normalization (S2) |
| `booking.clients_name_search_idx` | new GIN `gin_trgm_ops` expression index | Name search stays index-backed (S3) |

No table, column, constraint, trigger, or data changes.

## Verification before commit

Run on a disposable `pilates_test_staff004` database after every shipped
migration (then dropped):

```text
search_text('Lucía Fernández') → lucia fernandez
search_text('Mariana NÚÑEZ')   → mariana nunez
search_text(NULL)              → NULL
EXPLAIN … WHERE booking.search_text(name) LIKE '%lucia%'
  → Bitmap Index Scan on clients_name_search_idx
```

## Rollout and rollback

- Expand-only and compatible with the running API and worker (ADR-0078): the
  old search keeps working until the new repository query ships.
- Applied locally only to `pilates_test_*` databases (through
  `startDatabaseTestContext`) and `pilates_dev_sim`.
- Rollback: `DROP INDEX booking.clients_name_search_idx; DROP FUNCTION
  booking.search_text(text);`, then mark the migration rolled back with
  `prisma migrate resolve --rolled-back 20260923000000_accent_insensitive_client_search`.

## Tests that cover it

- `test/database/assistant-clients.integration-spec.ts` gains accent- and
  case-folding cases on name and email and a LIKE-wildcard escape case.
- The unchanged STAFF-003 cases (phone contains, 20-row limit, ordering,
  pending Accounts) keep passing.
