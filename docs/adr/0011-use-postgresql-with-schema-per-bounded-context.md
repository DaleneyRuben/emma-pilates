# Use PostgreSQL with a schema per bounded context

Status: accepted

PostgreSQL will be the system's single transactional database. Booking & Membership and Back Office each own a separate PostgreSQL schema, and system-level identity data such as Account lives in a small system schema rather than being assigned arbitrarily to either domain context.

Each module owns its schema definitions and migrations. Application code may write only through the owning module, preserving the write boundary established in [ADR-0005](./0005-modular-monolith-decomposed-by-bounded-context.md). Back Office may perform explicit read-only queries across Booking & Membership data for reports. Those queries are treated as named dependencies on the Booking schema and covered by integration tests so schema changes cannot silently break a report.

PostgreSQL is a direct fit for the system's consistency requirements: creating a Booking and consuming Subscription allowance must be atomic; capacity and waitlist promotion need concurrency control; and income/expense reporting combines related records across contexts. A document store would push these invariants and joins into application code without providing a compensating benefit at this scale.

Separate databases were rejected because they would make the existing cross-context reports and transactional operations more complex while gaining no useful deployment independence inside a single modular monolith.
