# BE-004 — pg-boss technical-schema review

Status: approved on 2026-08-30. Nothing in this review has been applied to a
developer, shared, or production database.

## Pinned artifact

- Package: `pg-boss@12.28.1`
- pg-boss schema version: `38`
- Required Node version: `>=22.12.0`
- Project verification runtime: Node `24.13.0`
- Schema: `pgboss`
- Generated SQL: [`sql/pg-boss-12.28.1-schema.sql`](./sql/pg-boss-12.28.1-schema.sql)
- Generated SQL size: 415 lines, 17,440 bytes
- SHA-256: `42e11ca23cd32c428c1c4c1ed0cc409533a6332c53df2c3b48840d4122c5cb32`

The SQL is the output of `getConstructionPlans('pgboss')` from the pinned
package with trailing whitespace removed. No SQL statement was changed. It is
committed as a review artifact, not as an application migration, and has not
been executed.

## Vendor-owned objects

Schema version 38 creates one enum, ten base tables, five helper functions,
managed indexes and constraints, and two date partitions for initial queue
statistics. These are pg-boss internals, not Pilates domain tables.

| Object           | Why pg-boss needs it                                     |
| ---------------- | -------------------------------------------------------- |
| `version`        | Records the installed pg-boss schema version             |
| `queue`          | Stores queue definitions, policies, and current counters |
| `job`            | Partitioned parent for durable jobs                      |
| `job_common`     | Default job partition shared by the two initial queues   |
| `job_dependency` | Supports pg-boss job dependencies; unused by BE-004      |
| `schedule`       | Supports pg-boss cron schedules; unused by BE-004        |
| `subscription`   | Supports pg-boss event subscriptions; unused by BE-004   |
| `bam`            | Tracks pg-boss-managed asynchronous upgrade work         |
| `warning`        | Stores optional sanitized pg-boss warnings               |
| `queue_stats`    | Supports optional historical queue statistics            |

The schema also creates the `job_state` enum; `create_queue`, `delete_queue`, and
three job-table maintenance functions; and vendor-managed indexes and foreign
keys. The application will not read or write these objects directly.

BE-004 keeps queue partitioning and persisted queue-stat history disabled. Both
initial queues use `job_common`, and the worker will not create daily statistics
partitions at runtime. Startup also sets `migrate: false`, so API and worker
processes cannot install or upgrade these objects.

## Exact initial queue settings

The migration runner will create the failed queue first and the delivery queue
second.

### `system.authentication-email.failed.v1`

| Setting                 | Value                         |
| ----------------------- | ----------------------------- |
| Policy                  | `standard`                    |
| Retries                 | `0`                           |
| Created-job retention   | `2,592,000` seconds (30 days) |
| Completed-job retention | `2,592,000` seconds (30 days) |
| Dedicated partition     | `false`                       |
| `LISTEN/NOTIFY`         | `false`                       |

No worker consumes this queue automatically. Exhausted or permanent delivery
failures remain available for controlled inspection or replay, then expire.

### `system.authentication-email.v1`

| Setting                 | Value                                            |
| ----------------------- | ------------------------------------------------ |
| Policy                  | `standard`                                       |
| Retries                 | `3` after the initial attempt                    |
| Retry delay             | `30` seconds with exponential backoff and jitter |
| Maximum retry delay     | `300` seconds                                    |
| Active-job expiry       | `30` seconds                                     |
| Created-job retention   | `691,200` seconds (8 days)                       |
| Completed-job retention | `604,800` seconds (7 days)                       |
| Dead-letter queue       | `system.authentication-email.failed.v1`          |
| Dedicated partition     | `false`                                          |
| `LISTEN/NOTIFY`         | `false`                                          |

Eight-day created-job retention covers the longest seven-day Activation Link.
The handler still reloads the Authentication Token before every attempt, so an
expired or superseded link completes as a no-op.

## Retry-timing adjustment

The approved email ADR described retries at approximately 30 seconds, two
minutes, and five minutes. pg-boss's built-in exponential retry algorithm cannot
express that exact three-value sequence. With the proposed settings, the actual
bounded ranges are:

1. 30–60 seconds;
2. 60–120 seconds; and
3. 120–240 seconds.

This keeps four total attempts and finishes inside the accepted roughly
ten-minute window. It is the lean option: matching the earlier three values
exactly would require application-managed replacement jobs and extra retry
state. Approval of this review accepts the native bounded ranges above and will
update the ADR wording during implementation.

## Runtime database access

- The deployment migration role installs or upgrades `pgboss` and creates the
  approved queues.
- API and worker runtime roles receive only the privileges required by the
  supported pg-boss operations they perform.
- The API can enqueue through the application-owned scheduler but registers no
  worker.
- The worker can claim, complete, fail, supervise, and inspect the two approved
  queues.
- Neither runtime process receives permission to migrate the schema.

Exact production role names and grants remain deployment-environment
configuration. Local and disposable-test databases may use one owner role, but
the application still starts with pg-boss migration disabled.

## Rollback impact

Before BE-004 is used, rollback removes the two empty queue definitions and
drops the isolated `pgboss` schema. After jobs exist, dropping the schema would
discard queued and failed work, so a later rollback must first drain, preserve,
or deliberately discard those jobs. No `system`, `booking`, or `back_office`
table is changed either way.

## Approval decision

Approved on 2026-08-30, including the native retry ranges. Approval authorizes
creating the reviewed migration artifact, testing it only against disposable
PostgreSQL, and implementing BE-004 through TDD. It does not authorize applying
the migration to the developer, shared-development, or production database.
