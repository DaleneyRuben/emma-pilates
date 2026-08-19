# Use a PostgreSQL-backed durable job queue

Status: accepted

The backend will use a durable job queue stored in PostgreSQL for scheduled checks, reminders, push-notification delivery, and other work that should survive an API restart or complete outside an HTTP request. Queue data lives in a dedicated technical schema rather than either bounded context's schema, reusing the database selected in [ADR-0011](./0011-use-postgresql-with-schema-per-bounded-context.md) without introducing Redis or a cloud-specific messaging service.

Jobs are recorded transactionally with the state change that requires them whenever possible. Workers provide delayed execution, exclusive claiming, bounded retries, and failed-job visibility. Delivery is treated as at-least-once: every handler must be idempotent, reload authoritative state by stable identifiers, and confirm that the requested work is still applicable before acting. A scheduled Session check, for example, must tolerate the Session being changed or cancelled before its execution time.

This queue will run the one-time empty-Session check, Subscription and Evaluation reminders, and asynchronous notification delivery. It will not move consistency-sensitive domain work out of the transaction that owns it: when a Booking cancellation frees capacity, Waitlist promotion and allowance consumption remain synchronous under the protections established by [ADR-0015](./0015-use-prisma-for-postgresql-access.md); only the resulting notification is queued.

A cron-first design backed by durable processing markers was rejected as the primary mechanism because the application would need to build its own claiming, retry, deduplication, and failure-inspection machinery. Cron remains available for reconciliation or maintenance sweeps. Redis with BullMQ was rejected because its scaling benefits do not justify another stateful service or the PostgreSQL-to-Redis consistency boundary at the expected workload. A managed cloud queue remains a hosting-dependent option if future scale or operational requirements justify replacing this design.

This decision does not select the PostgreSQL queue library, push-notification provider, worker process topology, retry timings, retention policy, or monitoring tools.
