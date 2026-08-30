# BE-004 — pg-boss authentication-email proposal

Status: proposed for explicit approval. This document installs no dependency,
creates no database object, and applies no migration.

## What this adds

BE-004 provides the smallest durable background-job foundation needed by the
identity slice:

- one vendor-owned pg-boss technical schema;
- one versioned authentication-email queue and one failed-job queue;
- a separate backend worker entrypoint;
- transactional enqueueing from System Identity use cases;
- a local email-capture adapter for development and tests;
- the accepted authentication-email retry policy; and
- a sanitized worker-progress heartbeat.

It does not connect SendPulse, build a queue dashboard, introduce a generic job
framework, or create application-owned queue tables.

## Technical schema ownership

The PostgreSQL schema will be named `pgboss`. pg-boss owns every table, type,
function, index, constraint, and internal version record inside that schema.
Application code must not model those objects in Prisma or query them directly.

The schema is technical infrastructure, not part of `system`, `booking`, or
`back_office`. It has no foreign keys to application tables. Queue payloads carry
stable identifiers, and workers reload authoritative application state through
the owning context before acting.

The implementation will pin one pg-boss version. Its exact generated install SQL
and schema version will be committed for review before any migration is created
or applied. Later pg-boss upgrades require the same explicit review; API and
worker startup never install or upgrade the schema automatically.

## Queues

| Queue                                   | Purpose                                                                    | Policy                                                      |
| --------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `system.authentication-email.v1`        | Deliver current verification, activation, and password-recovery links      | Standard queue; at-least-once handling; four attempts total |
| `system.authentication-email.failed.v1` | Retain exhausted or permanent failures for controlled diagnosis and replay | No automatic worker; sanitized records retained for 30 days |

The failed queue exists before the delivery queue references it. Queue creation
and configuration are part of the reviewed deployment migration step, not
worker startup.

BE-004 adds no reminder, notification, image-processing, or scheduling queues.
Those queues will be introduced only by the feature that needs them.

## Authentication-email job contract

The versioned payload contains only:

| Field                   | Purpose                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `version`               | Selects the payload decoder; initially `1`                               |
| `accountId`             | Reloads the Account and its current normalized email                     |
| `authenticationTokenId` | Reloads and validates the exact current Authentication Token             |
| `purpose`               | `verification`, `activation`, or `password_recovery`                     |
| `encryptedLinkSecret`   | Authenticated ciphertext needed to reconstruct the link in worker memory |
| `encryptionKeyId`       | Selects the application-managed encryption key without storing the key   |

The payload does not contain a plaintext email address, usable link, token,
password, provider credential, or domain profile. Encryption uses established
platform cryptography with a fresh nonce and authenticated encryption; the key
lives outside PostgreSQL. Logs and failure output never include the ciphertext
or reconstructed secret.

The job uses the Authentication Token identifier as its stable deduplication
key. A newly issued token creates a new job; retries reuse the same job and link
material. Correcting an email or issuing a replacement token makes old work
stale without editing its payload.

## Transaction and worker flow

1. A System Identity use case creates or replaces an Authentication Token.
2. In the same Prisma transaction, the application-owned job scheduler inserts
   the pg-boss job through the supported Prisma transaction adapter.
3. The API returns only after the token and job commit together. A failure rolls
   back both.
4. The worker claims the job and reloads the Account and Authentication Token.
5. It completes the job as a successful no-op when the token is missing, used,
   expired, invalidated, superseded, or no longer matches the Account and
   purpose.
6. Otherwise it decrypts the link secret only in memory, renders the
   purpose-specific message, and calls the project-owned email-delivery
   interface.
7. The worker records only a sanitized outcome and clears plaintext link
   material from its working scope.

Delivery is at least once. If provider acceptance is ambiguous, a duplicate
email may be sent, but every copy contains the same link and cannot restore a
link that authoritative state has invalidated.

## Local email capture

Local development and automated tests use an in-process email-capture adapter.
It records the rendered recipient, purpose, subject, and link in a test- or
development-owned capture boundary so a journey can inspect and open the email
without a provider account.

The adapter is unavailable outside explicitly validated local or test
environments. Production configuration must fail closed until a real provider
adapter is configured. SendPulse remains deferred to `EXT-001` after the local
authentication journeys work.

## Retry and retention preset

Authentication-email delivery follows the already accepted policy:

- one initial attempt plus three retries;
- retry delays of approximately 30 seconds, two minutes, and five minutes, with
  bounded jitter;
- a hard ten-second timeout for each provider attempt;
- retries only for network failures, timeouts, provider rate limits, and
  provider server failures;
- immediate failure for invalid input, recipient rejection, missing
  configuration, provider authentication, and other permanent failures; and
- a current-state check before every attempt.

The implementation will encapsulate these values in one typed
`authenticationEmail` preset and test the attempt count, timeout, retry
classification, and delay bounds. Completed delivery jobs may use the pg-boss
default short retention. Failed jobs retain only the minimized encrypted payload
and sanitized diagnostic category for 30 days, then pg-boss removes them.

## Worker entrypoint and heartbeat

`apps/backend` gains a separate worker bootstrap and command. It composes only
the configuration, database, System Identity read boundary, job infrastructure,
and local email adapter required by this slice. It does not start the public API.

The API and worker both start pg-boss with migration disabled. The worker owns
job consumption and supervision; API-side enqueueing does not register workers.
Both fail startup when the installed technical schema is missing or behind the
pinned library version.

The worker emits a periodic structured `worker_heartbeat` progress signal with
only service version, timestamp, and sanitized queue-health counts. It also logs
job family, attempt, duration, outcome, and sanitized failure category. No new
heartbeat table is created. External alert delivery and production thresholds
remain in `BE-005`.

## Test-first implementation plan

After schema approval, BE-004 will be implemented through these observable
tests before production code:

1. a disposable PostgreSQL integration test proves application state and its
   job commit or roll back together;
2. worker tests prove current jobs deliver and stale jobs complete as no-ops;
3. contract tests prove plaintext secrets and email addresses never enter queue
   rows, logs, or failure output;
4. retry tests prove temporary and permanent failure classification, four total
   attempts, timeout, and delay bounds;
5. local-adapter tests prove captured verification, activation, and recovery
   links can drive their intended local journeys; and
6. startup tests prove API and worker processes refuse an absent or outdated
   pg-boss schema instead of migrating it.

The tests use only disposable PostgreSQL databases whose migrations include the
reviewed pg-boss install. No developer or shared database is modified.

## Migration impact for approval

Approval authorizes the implementation to prepare, but not yet apply, this
database change:

1. install the pinned pg-boss vendor objects in the new `pgboss` schema;
2. create only the two queues listed above with their reviewed retry, timeout,
   retention, and dead-letter settings;
3. grant the API only the queue access needed to enqueue work and grant the
   worker the access needed to consume and supervise it;
4. make no changes to the existing `system`, `booking`, or `back_office`
   application tables; and
5. add no Prisma models, seed jobs, provider credentials, or runtime schema
   synchronization.

Before the migration is created or applied, the implementation will present the
pinned pg-boss version, exact generated SQL or reviewed installation artifact,
queue settings, rollback effect, and disposable-database verification for a
second explicit approval.

## Approval decision

Approving this proposal means the next implementation step may install pg-boss,
write the failing tests, add the worker and local capture boundary, and prepare
the exact technical-schema migration for review. It does not authorize applying
that migration to any database.
