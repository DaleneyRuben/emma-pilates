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

## Retention of dumps

- Keep the **35 most recent daily dumps** and the **last dump of each of the
  last 12 months**.
- Configure this as an R2 lifecycle rule or in the dump job's cleanup step.
  Deleting an old *dump file* is not deleting database rows, so ADR-0086 does not
  apply to it.
- The bucket is private. Only the dump job (write) and the owner's restore
  credential (read) have keys. Rotate them as in the
  [incident runbook](./incident-response.md).

## Check the job every week

- The dump job reports a heartbeat to Better Stack
  ([ADR-0081](../adr/0081-use-provider-logs-and-better-stack-monitoring.md)); a
  missed heartbeat alerts by email.
- Open the bucket and confirm today's dump exists and its size is close to
  yesterday's. A dump that suddenly shrinks is a failure.

Both are set up when the production deployment (ADR-0027) is created; until
then no dump exists and no drill can run. Do not launch with real Client data
before the first drill in the log below has passed.

## Restore drill

Run one **every quarter** and **after every major migration**: any migration that
alters or drops columns or constraints on existing tables, or backfills data.

1. Download the latest dump from R2 and check its size and checksum against the
   job's log line.
2. Create a disposable database **outside production**, on a local PostgreSQL 17
   or a scratch database on the provider, named `pilates_restore_drill_YYYYMMDD`.
   Never restore into the production database for a drill.
3. Restore into it with `pg_restore` (or `psql` for a plain dump). Note the
   duration.
4. Check the schema is at the release you expect:

   ```sh
   DATABASE_URL="postgresql://…/pilates_restore_drill_YYYYMMDD" \
     pnpm --filter @pilates/backend exec prisma migrate status
   ```

   It must report the database is up to date, or list only the migrations the
   release added after the dump.
5. Start the API from the current release image against the restored database
   (a local container is fine) and run the smoke check:

   ```sh
   SMOKE_BASE_URL=http://localhost:3100 pnpm --filter @pilates/backend smoke
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
   production at the time of the dump. A restored table with fewer rows is a
   failure.
8. Drop the disposable database and delete the downloaded dump from the machine.
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
