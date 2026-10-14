# Runbook: backups and restore drills

Implements decision G9 of
[BE-007](../implementation/BE-007-data-governance-proposal.md) on top of
[ADR-0027](../adr/0027-deploy-the-initial-backend-on-northflank-with-aiven-postgresql.md):
a daily logical `pg_dump` stored privately in Cloudflare R2. ADR-0027 also says
recovery is **unverified until a dump has been restored successfully outside
the production database**; the drills below are how it becomes verified.

## What is backed up

| Data | Backed up | Why |
| --- | --- | --- |
| The PostgreSQL database (`system`, `booking`, `back_office`, and the `pgboss` schema) | Yes, one logical dump per day | The system of record. Nothing in it is ever physically deleted (ADR-0086), so a dump holds the full history |
| Receipt images | No | They are deleted on purpose after 45 days or 7 days after the decision (ADR-0075); the database keeps their metadata |
| Profile photos and Promotion images | No | They can be uploaded again by the person or an Administrator |

## How the dump is made

Northflank's scheduled job `backup` (the project's second job) runs
`node dist/src/database-backup-main.js` every day at **03:00 La Paz**
(07:00 UTC; La Paz has no daylight saving) from `apps/backend/Dockerfile`
built with `POSTGRESQL_CLIENT_MAJOR=18`, so it carries `pg_dump` 18 for Aiven's
PostgreSQL 18 (EXT-009). Each run:

1. counts `system.accounts`, `booking.clients`, `booking.payments`,
   `booking.bookings`, and `system.audit_records` (one short connection);
2. runs `pg_dump --format=custom` over TLS verified against
   `/etc/secrets/emma-ca.pem`, taking host, user, password, and CA from
   `DATABASE_URL` as libpq variables (one connection, `application_name`
   `pilates-backup`; the API and worker hold at most 8 of Aiven's 20);
3. uploads the file once as `daily/emma-<UTC time>.dump`
   (`daily/emma-20261014T070012Z.dump`), refusing to overwrite, with its
   SHA-256 and the row counts as object metadata;
4. copies it over `monthly/emma-<La Paz month>.dump`, so each month's copy
   ends as that month's last dump;
5. logs `database_backup_succeeded` (key, size, previous size, SHA-256, row
   counts, duration) and pings the Better Stack heartbeat «Database backup».

A failed step logs `database_backup_failed` with the stage (`count`, `dump`,
`upload`, `copy`), pings the heartbeat's `/fail` URL, which opens an incident
at once, and exits 1, so Northflank retries once. A dump under half the size
of the previous one is kept, logged as `database_backup_shrank`, and pinged as
a failure. A run that never starts or crashes pings nothing, and the missed
heartbeat alerts.

The release workflow builds each released commit on the `backup` job without
running it (repository variable `NORTHFLANK_BACKUP_JOB_ID`), so the next
scheduled run uses the released code.

## Retention of dumps

- Keep the **35 most recent daily dumps** and the **last dump of each of the
  last 12 months**.
- R2 lifecycle rules do it by age, so the job never deletes anything:
  `daily/` objects are deleted 35 days after upload, and `monthly/` objects
  365 days after their last overwrite (12 complete months plus the current
  one). A bucket lock keeps every `daily/` object from being deleted or
  overwritten for 30 days, even with the job's own token.
  Deleting an old *dump file* is not deleting database rows, so ADR-0086 does
  not apply to it.
- The bucket `emma-pilates-prod-backups` is private. Only the job's token
  `northflank-production-backups` (Object Read & Write on this bucket only; R2
  has no write-only permission) and the owner's restore token
  `mac-backup-restore` (Object Read only on this bucket) have keys. The job's
  keys live only on the Northflank `backup` job, never in the `production`
  group, so the API and worker cannot reach the dumps. Rotate them as in the
  [incident runbook](./incident-response.md).

## Check the job every week

- A missed or failed heartbeat alerts by email
  ([ADR-0081](../adr/0081-use-provider-logs-and-better-stack-monitoring.md)).
- From the repository root, with the restore token read at hidden prompts
  (nothing is echoed or saved):

  ```sh
  read -rs BACKUP_STORAGE_ACCESS_KEY_ID && read -rs BACKUP_STORAGE_SECRET_ACCESS_KEY && \
  export BACKUP_STORAGE_ACCESS_KEY_ID BACKUP_STORAGE_SECRET_ACCESS_KEY && \
  BACKUP_STORAGE_ENDPOINT=https://1121636a866de46f92544db1a7ebe310.r2.cloudflarestorage.com \
  BACKUP_STORAGE_BUCKET=emma-pilates-prod-backups \
  pnpm --filter @pilates/backend backup:check; unset BACKUP_STORAGE_ACCESS_KEY_ID BACKUP_STORAGE_SECRET_ACCESS_KEY
  ```

  It prints `"passed": true` with the latest dump's size and age, or lists the
  problems: no dump, the latest older than 26 hours or under half the
  previous one, a missing day in the last 35, a month without its copy, or a
  dump the lifecycle rules should have deleted.

Do not launch with real Client data before the first drill in the log below
has passed.

## Restore drill

Run one **every quarter** and **after every major migration**: any migration that
alters or drops columns or constraints on existing tables, or backfills data.

1. Download the latest dump from R2 with the restore token and check its
   checksum against the object's metadata (and the job's log line):

   ```sh
   read -rs AWS_ACCESS_KEY_ID && read -rs AWS_SECRET_ACCESS_KEY && \
   export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION=auto \
     AWS_REQUEST_CHECKSUM_CALCULATION=when_required \
     AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
   R2=https://1121636a866de46f92544db1a7ebe310.r2.cloudflarestorage.com
   KEY=$(aws --endpoint-url $R2 s3 ls s3://emma-pilates-prod-backups/daily/ | sort | tail -1 | awk '{print $4}')
   aws --endpoint-url $R2 s3api head-object --bucket emma-pilates-prod-backups --key daily/$KEY --query Metadata
   aws --endpoint-url $R2 s3 cp s3://emma-pilates-prod-backups/daily/$KEY ~/Downloads/drill.dump --no-progress
   shasum -a 256 ~/Downloads/drill.dump
   unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
   ```

   The digest must equal the metadata's `sha256`; keep its `row-counts`.
2. Create a disposable database **outside production**, on the Mac's
   PostgreSQL 18 (port 5433), named `pilates_restore_drill_YYYYMMDD`. Never
   restore into the production database for a drill.

   ```sh
   export PATH=/opt/homebrew/opt/postgresql@18/bin:$PATH PGPORT=5433
   createdb pilates_restore_drill_YYYYMMDD
   ```

3. Restore into it and note the duration. Owners and grants are Aiven's
   `avnadmin`, which the Mac does not have, so leave them out:

   ```sh
   time pg_restore --no-owner --no-acl --exit-on-error \
     -d pilates_restore_drill_YYYYMMDD ~/Downloads/drill.dump
   ```

4. Check the schema is at the release you expect:

   ```sh
   DATABASE_URL="postgresql://…/pilates_restore_drill_YYYYMMDD" \
     pnpm --filter @pilates/backend exec prisma migrate status
   ```

   It must report the database is up to date, or list only the migrations the
   release added after the dump.
5. Start the API of the current release against the restored database on a
   spare port and run the smoke check:

   ```sh
   cd apps/backend && pnpm build
   DATABASE_URL="postgresql://$USER@localhost:5433/pilates_restore_drill_YYYYMMDD" \
     PORT=3199 node dist/src/main.js &
   SMOKE_BASE_URL=http://localhost:3199 node dist/src/smoke-check-main.js
   kill %1
   ```

6. Run the fixture-free checks below in `psql`. They read what the dump holds
   and need no test data:

   ```sql
   -- The append-only guards survived the restore.
   SELECT count(*) FROM pg_trigger
   WHERE tgname IN ('audit_records_reject_update_or_delete',
                    'audit_records_reject_truncate');           -- expect 2
   SELECT count(*) FROM pg_trigger
   WHERE tgrelid = 'booking.credit_ledger_entries'::regclass
     AND NOT tgisinternal;                                       -- expect ≥ 1

   -- The Credit ledger still reconciles: no negative available balance.
   SELECT client_id,
          sum(CASE kind WHEN 'referral_award' THEN amount_centavos
                        WHEN 'payment_release' THEN amount_centavos
                        WHEN 'payment_reservation' THEN -amount_centavos
                        WHEN 'account_closure' THEN -amount_centavos
                        ELSE 0 END) AS available
   FROM booking.credit_ledger_entries
   GROUP BY client_id HAVING sum(CASE kind WHEN 'referral_award' THEN amount_centavos
                        WHEN 'payment_release' THEN amount_centavos
                        WHEN 'payment_reservation' THEN -amount_centavos
                        WHEN 'account_closure' THEN -amount_centavos
                        ELSE 0 END) < 0;                         -- expect 0 rows

   -- Every live Client has exactly one live Account, and no live Account
   -- points at a removed Client.
   SELECT count(*) FROM booking.clients c
   WHERE c.deleted_at IS NULL
     AND (SELECT count(*) FROM system.accounts a
          WHERE a.client_id = c.id AND a.deleted_at IS NULL) <> 1;   -- expect 0

   -- The newest audit record is from the last day before the dump.
   SELECT max(occurred_at) FROM system.audit_records;
   ```

7. Compare the row counts of `system.accounts`, `booking.clients`,
   `booking.payments`, `booking.bookings`, and `system.audit_records` with
   the `row-counts` the job stored with the dump (taken just before it).
   Rows are never deleted (ADR-0086), so a restored table with fewer rows is a
   failure.
8. Drop the disposable database and delete the downloaded dump from the
   machine (`dropdb pilates_restore_drill_YYYYMMDD`,
   `rm ~/Downloads/drill.dump`).
9. Add a row to the drill log. A failed step is an incident: open it in the
   [incident log](./incident-response.md), fix the backup, and repeat the drill
   the same week.

## Restoring for real

A production restore is an incident action, not a routine one: follow
[incident-response.md](./incident-response.md), which says when to restore and
how to switch the API and worker to the restored database.

## Drill log

| Date | Dump used | Restored in | Migrate status | Smoke check | Fixture-free checks | Done by |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |
