# Reconcile due work into pg-boss

Status: accepted

PostgreSQL domain state is the source of truth for reminders, expirations, automatic Session checks, and other time-based work. The worker runs small recurring reconcilers that query for due or missing work using the PostgreSQL clock, then enqueue durable pg-boss jobs. This is a cron-like scan feeding the queue rather than a second scheduler or one fragile delayed job being the only record that work is required.

Each queued job has a stable business key and carries only identifiers plus the expected due time or state version. A handler reloads the authoritative record and rechecks that the action is still due before changing state or sending anything; stale, duplicate, cancelled, or already-completed work becomes a successful no-op. Reconcilers and handlers are idempotent, and enqueue markers or pg-boss singleton keys prevent repeated scans from creating unbounded duplicates. If the worker is unavailable, the next successful scan finds overdue or missing work again.

Business deadlines are calculated in `America/La_Paz` under [ADR-0057](./0057-use-bolivia-time-for-all-business-scheduling.md), converted to exact instants, and compared against the database clock. Scan frequency, look-ahead windows, retry timing, retention, and alerts are configured per job family during implementation and tested with controlled clocks; correctness must not depend on a scan running at an exact second.

Scheduling only one delayed job when a record is created was rejected because edits, cancellation, queue loss, or operational mistakes could leave no authoritative path to rediscover the work. Performing every action directly inside a cron scan was rejected because it would combine discovery, claiming, retries, and long-running delivery in one process. The reconciler-plus-job pattern preserves recoverable discovery while retaining pg-boss's claiming, retry, and failure visibility established in [ADR-0024](./0024-use-pg-boss-for-durable-background-jobs.md).
