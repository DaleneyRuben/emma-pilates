# STAFF-004 — Accent-insensitive Assistant Client search

Status: **approved 2026-09-23 under the blanket backlog-decision approval**
(the user pre-approved the migrations of the overnight queue on condition that
each has a proposal and review package committed before the migration).

## Problem

The Assistant's Client search (STAFF-003, S04) is a bounded, case-insensitive
`contains` over name, phone, and email. Spanish names carry accents, and
Assistants type quickly on a phone: "Lucia" does not find **Lucía Fernández**,
and "nunez" does not find **Núñez**. STAFF-003 recorded this as a gap needing
`unaccent`.

## Decisions (taken under the blanket approval)

| # | Decision | Rationale |
| --- | --- | --- |
| S1 | Enable the contrib extensions **`unaccent`** and **`pg_trgm`** in the `public` schema with `CREATE EXTENSION IF NOT EXISTS`. | Both ship with PostgreSQL 17 and are supported on Aiven (ADR-0027); `public` keeps them outside the context schemas they serve. |
| S2 | Add **`booking.search_text(text)`**: `lower(public.unaccent('public.unaccent'::regdictionary, value))`, declared `IMMUTABLE STRICT PARALLEL SAFE`. | `unaccent(text)` is only `STABLE` (its dictionary is looked up by search path), so it cannot back an index; naming the dictionary explicitly makes the wrapper safe to mark immutable, which is PostgreSQL's documented pattern. Owned by Booking & Membership, the context that owns `clients`. |
| S3 | Add one **GIN trigram index** on `booking.search_text(booking.clients.name)`. | Search is `%query%` (contains), which a B-tree cannot serve; a trigram index keeps name search index-backed as the Client list grows. Phone and email stay unindexed for this search: phone is a short digit match and email lives in `system.accounts`; both are bounded by the 20-row limit and can be indexed later from measurements. |
| S4 | The repository matches `booking.search_text(name)`, `booking.search_text(email)`, and `phone` with the normalized query, escaping `%`, `_`, and `\`, via one parameterized raw query that returns ids, then reads the rows through the existing Prisma select. | Keeps the output shape and ordering (name, then id) unchanged, and raw SQL inside the owning adapter with an integration test (coding standards). |
| S5 | Minimum query length (2), row limit (20), and authorization are unchanged. | Behavior change is only in matching. |

## Tables, constraints, and indexes

No table, column, or constraint changes. New objects:

| Object | Kind | Definition |
| --- | --- | --- |
| `unaccent` | extension | `CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public` |
| `pg_trgm` | extension | `CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public` |
| `booking.search_text(text)` | SQL function | `SELECT lower(public.unaccent('public.unaccent'::regdictionary, $1))`, `IMMUTABLE STRICT PARALLEL SAFE` |
| `clients_name_search_idx` | GIN index on `booking.clients` | `USING gin (booking.search_text(name) public.gin_trgm_ops)` |

## Migration impact

- Additive and backward-compatible: the previous API and worker keep working
  before and after (ADR-0078 expand step only).
- `CREATE EXTENSION` needs a role allowed to create trusted extensions
  (`unaccent` and `pg_trgm` are trusted in PostgreSQL 13+, so the database
  owner suffices; on Aiven the default admin role can create them).
- The index build locks `booking.clients` against writes for its duration;
  with a studio-sized table (hundreds to low thousands of rows) that is
  milliseconds. `CREATE INDEX CONCURRENTLY` is not used because Prisma runs
  each migration in a transaction.
- Rollback: `DROP INDEX booking.clients_name_search_idx; DROP FUNCTION
  booking.search_text(text);` (the extensions may stay).
- Prisma: nothing in `schema.prisma` changes; the migration is hand-written SQL.

## Representative rows

| `clients.name` | `search_text(name)` | Query "lucia" | Query "NUÑEZ" |
| --- | --- | --- | --- |
| Lucía Fernández | `lucia fernandez` | matches | — |
| Mariana Núñez | `mariana nunez` | — | matches |
| Luciana Paz | `luciana paz` | matches (contains) | — |

Email `Sofía.Guzmán@example.com` normalizes to `sofia.guzman@example.com`, so
"guzman" finds it; phone `+591 70011001` still matches "7001".
