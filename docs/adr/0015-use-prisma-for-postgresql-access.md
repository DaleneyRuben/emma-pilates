# Use Prisma for PostgreSQL access

Status: accepted

The backend will use Prisma ORM for PostgreSQL schema definition, migrations, ordinary queries, and transaction management. Prisma model files are grouped by owning context and map models into the `booking`, `back_office`, and `system` PostgreSQL schemas selected in [ADR-0011](./0011-use-postgresql-with-schema-per-bounded-context.md).

The expected layout is:

```text
apps/backend/prisma/
  schema.prisma
  models/
    booking.prisma
    back-office.prisma
    system.prisma
  migrations/
```

Prisma Client is an infrastructure implementation detail. Controllers and application use cases do not inject it directly. Each bounded context owns repository adapters that expose only the persistence operations its use cases need. Cross-context writes still go through the owning Nest module's public application interface; the existence of a generated client capable of accessing every model does not grant permission to bypass that interface. Import rules and architecture tests enforce this restriction.

Critical concurrency flows use short interactive transactions with an explicitly selected isolation strategy and bounded retry handling. This includes creating a Booking while consuming allowance, enforcing Session capacity, cancelling a Booking while promoting a Waitlist entry, and any operation that could otherwise allocate the same resource twice. Database constraints remain the final protection for uniqueness and non-negative state. PostgreSQL-specific locking or reporting queries may use Prisma TypedSQL or parameterized raw SQL inside the same transaction when Prisma's model API cannot express them safely or clearly.

Prisma was selected over Drizzle and Kysely because its generated client, relations, migrations, and broad tooling reduce routine persistence work for a small team. The tradeoff is that advanced PostgreSQL behavior sometimes requires SQL and the generated client does not enforce bounded-context ownership. We accept that tradeoff with the explicit repository, import, testing, and migration-review rules above.

Generated migrations are reviewed before application. Production deployments run committed migrations; they never use schema pushing or runtime auto-synchronization.
