# Runbook: release the backend to production

How a backend commit reaches production on Northflank with its migrations
first ([ADR-0052](../adr/0052-run-backend-processes-from-one-deployable-package.md),
[ADR-0080](../adr/0080-separate-health-and-deployment-checks.md)). Since
EXT-008 (2026-10-14) a merge to `main` releases itself through the
`release production` workflow; the steps by hand below are the fallback.

## What runs where

| Piece | Where | Notes |
| --- | --- | --- |
| API | Northflank project `default`, team `emma-pilates`, combined service `api`, region US Central (Council Bluffs) | Developer Sandbox, nf-compute-20 (0.2 vCPU, 512 MB), 1 instance; public at https://p01--api--mmps25fn9k9x.code.run, port 3100 HTTP |
| Worker | Northflank combined service `worker` | Same image as `api`, command `node dist/src/worker-main.js`, no ports, nf-compute-20; watched by the Better Stack «Worker heartbeat» |
| Migrations | Northflank manual job `migrate` | Same repository, branch, and `apps/backend/Dockerfile`; command `node_modules/.bin/prisma migrate deploy`; retry limit 0 |
| Backups | Northflank cron job `backup` | Same repository and Dockerfile, build argument `POSTGRESQL_CLIENT_MAJOR=18`; command `node dist/src/database-backup-main.js` daily at 03:00 La Paz; writes to R2 `emma-pilates-prod-backups` ([backups runbook](./backups-and-restore-drills.md)) |
| Database | Aiven project `emma-pilates-prod`, service `emma-pilates-prod-db`, database `emma` | Free plan, PostgreSQL 18, DigitalOcean US West (Santa Clara), 20 connections, 1 GB disk |
| Settings | Northflank secret group `production` (runtime, unrestricted) | Every variable both pieces share, plus the files `/etc/secrets/emma-ca.pem` (Aiven's CA) and `/etc/secrets/transfer-qr.png` |
| Admin web | Vercel project `emma-pilates-admin`, production alias https://emma-pilates-admin.vercel.app | `vercel.json` sends that host's `/api/v1` to the Northflank API |
| Monitoring | Better Stack «Production API readiness», every 3 minutes | Error tracking `emma-pilates-api` through `ERROR_REPORTING_DSN` |

CI is **off** on every service and job, so a push never builds by itself;
only the workflow (or a person) starts a build. CD is **on** for all of them:
a finished build of `api` or `worker` deploys at once, and a finished build of
`migrate` or `backup` becomes the image its next run uses. Leave the toggles
as they are.

## Release a commit (automatic)

Merge the pull request. When `ci` passes on the push to `main`,
[`.github/workflows/release-production.yml`](../../.github/workflows/release-production.yml)
starts within seconds and runs
`pnpm --filter @pilates/backend release:production`
(`apps/backend/src/deployment/`), which:

1. skips the commit as **superseded** if `main` has moved on (its own release
   carries these changes, and an older commit must never roll production
   back);
2. builds the commit on the `migrate` job and waits for it (at most 20 min);
3. runs `migrate` and waits for `SUCCESS` (at most 10 min);
4. only then builds the same commit on the `api` service (at most 20 min);
   CD deploys it and the readiness probe keeps the old instance serving
   until the new one is ready;
5. waits until `/health/ready` reports the commit (at most 10 min);
6. builds the same commit on the `worker` service (at most 20 min) and waits
   until its rollout completes after that build started (at most 10 min);
   the repository variable `NORTHFLANK_WORKER_SERVICE_ID` names the service,
   and an empty value skips this step (EXT-002);
7. builds the same commit on the `backup` job without running it (at most
   20 min), so the next scheduled dump uses it; the repository variable
   `NORTHFLANK_BACKUP_JOB_ID` names the job, and an empty value skips this
   step (EXT-009);
8. runs `pnpm smoke` with `SMOKE_EXPECTED_RELEASE` set to the commit.

Every step starts only after the one before it succeeded, and the first
failure stops the release. The job's own limit is 60 minutes. Releases queue
under the `production-release` concurrency group without cancelling: a
release in progress is never interrupted mid-migration, and of several
pending merges only the newest is released. The run's summary names the
outcome; GitHub emails the operator when it fails. The first automatic
release (`87fe95d2`, 2026-10-14) took 5 m 6 s: migrate build 1 m 22 s, run
31 s, api build 1 m 22 s, readiness 31 s, smoke 10 s.

To watch one: `gh run list --workflow release-production.yml --limit 3`, then
`gh run view <id> --log | grep -E "migrate|api build|readiness|outcome|passed"`.

## When a release fails

The log line names the stage, the Northflank build or run, and its status
(and Northflank's message for a failed build). Nothing is rolled back
automatically (ADR-0080):

| Failed at | Production is running | What to do |
| --- | --- | --- |
| migrate build | the previous release, schema untouched | Read the build's log in Northflank (Jobs → `migrate` → Builds), fix, merge again |
| migrate run | the previous release; the schema may be partly migrated | Read the run's Logs; fix the migration forward, never edit an applied one |
| api build | the previous release on the new schema | Read the build's log (Services → `api` → Builds); fix and merge again |
| worker build or rollout | the new API; the worker on its previous release | Read Services → `worker` → Builds or Logs (a `ZodError` names a missing setting); fix and merge again. The old worker keeps running the jobs meanwhile |
| backup build | the new API and worker; the next dump uses the previous backup image | Read Jobs → `backup` → Builds; fix and merge again. Dumps keep running on the old image meanwhile |
| readiness | the previous release, or a new one that never became ready | Read `api`'s Logs: a `ZodError` names a missing setting, and readiness stays `503` until every migration shipped in the image is applied |
| smoke | the new release, marked unsuccessful | Read the smoke JSON in the run's log; decide on a fix forward or the incident runbook |
| any stage with `Northflank answered 401` or `403` | unchanged | The token expired or lost a permission; see «The deploy token» |

To release again without a new merge, run the workflow by hand: Actions →
`release production` → **Run workflow** (or
`gh workflow run release-production.yml -f sha=<full hash>`). The commit must
have a green `ci` run from a push to `main`; an empty `sha` means main's head.

## The deploy token

The workflow authenticates with the repository secret `NORTHFLANK_API_TOKEN`:
Northflank API token `github-actions-release` (team `emma-pilates`, created
2026-10-14, lifetime 1 year, so it expires around **2027-10-14**). It carries
the access role `github-production-release`, limited to project `default`
with Services → General Read and Update, and Jobs → General Read, Update,
and Run Job; nothing on secrets, addons, or the team. A token can only use a
role its creator belongs to, so the user is a member of that role.

To rotate it: Northflank → Team → **API tokens** → create a token with the
same role and lifetime; copy it with its copy icon; run
`gh secret set NORTHFLANK_API_TOKEN --repo DaleneyRuben/emma-pilates` and
paste at the hidden prompt; then delete the old token. Never print it.

## Release a commit by hand

Only when the workflow cannot run (GitHub Actions down, token lapsed):

1. Merge the pull request; wait for CI on `main` to pass.
2. **Migrations first.** Northflank → Jobs → `migrate` → Latest commits → on
   the commit to release, **Rebuild** (or Builds → Start build). When the
   build is green, **Run**. Open the run's Logs: it must end with «All
   migrations have been successfully applied.» or «No pending migrations to
   apply.». If it fails, stop: the API is still on the previous release.
3. **Then the API.** Services → `api` → Commits → **Rebuild** on the same
   commit. CD deploys it when the build finishes; the readiness probe keeps
   the old instance serving until the new one is ready.
4. **Then the worker.** Services → `worker` → Commits → **Rebuild** on the
   same commit; CD deploys it. Its Logs should show JSON lines with
   `"service":"worker"` and the new `release`.
5. **Then the backup image.** Jobs → `backup` → Builds → **Start build** on
   the same commit. Do not run it; the schedule does.
6. **Check the release** from the repository root:

   ```sh
   SMOKE_BASE_URL=https://p01--api--mmps25fn9k9x.code.run \
   SMOKE_EXPECTED_RELEASE=<full commit hash> \
   pnpm --filter @pilates/backend smoke
   ```

   It prints `"passed":true`. `/health/ready` reports the full commit hash as
   `release` because Northflank passes it to the image as `NF_GIT_SHA`.

Every migration must keep the previous API release working (expand first,
contract in a later release), because migrations run while that release still
serves traffic.

## Change a setting

Edit the `production` secret group (or a service's own Environment:
`AUTHENTICATION_LINK_BASE_URL` on both services, `TRUSTED_PROXY_HOPS` on
`api`, `WORKER_HEARTBEAT_URL` on `worker`), then **Restart** every service
that reads it, `api` and `worker` for the group: the group's own Restart button
only works for restricted groups. A missing or local-default production
setting stops the process at boot with a `ZodError` in its Logs that names the
variable.

## Database connection

`DATABASE_URL` in the secret group ends in
`?sslmode=verify-full&sslrootcert=/etc/secrets/emma-ca.pem&sslcert=/etc/secrets/emma-ca.pem&sslaccept=strict`.
node-pg (the API and pg-boss) reads `sslmode`/`sslrootcert` and Prisma's
migration engine reads `sslcert`/`sslaccept`; both verify Aiven's certificate
against its CA and refuse any other server (checked against a local TLS
PostgreSQL with a wrong CA on 2026-10-13). To build it without showing the
password, copy it with the copy icon in Aiven's Connection information and
run:

```sh
read -rs P && printf 'postgresql://avnadmin:%s@emma-pilates-prod-db-emma-pilates-prod.b.aivencloud.com:20680/emma?sslmode=verify-full&sslrootcert=/etc/secrets/emma-ca.pem&sslcert=/etc/secrets/emma-ca.pem&sslaccept=strict' "$P" | pbcopy && unset P
```

`DATABASE_POOL_MAX=4` is the most connections one process holds (BE-018). The
API gives its one pg-boss 1 and its one Prisma client 3; the worker splits 2
and 2. The API and the future worker together hold at most 8 of Aiven's 20,
which leaves room for the `migrate` job, the console, and backups. Each pool
names itself in `application_name` (`pilates-api-prisma`, `pilates-api-pgboss`,
`pilates-worker-prisma`, `pilates-worker-pgboss`), so the count per owner is
one query away (testing guide, Test 39). Never raise the value while an older
release that opened eight pools per API could still be running.

## Forwarded addresses

`TRUSTED_PROXY_HOPS=1` on the service: Northflank appends one
`X-Forwarded-For` entry to whatever the requester sent (measured 2026-10-13:
no header gave `forwardedFor` 1, two forged entries gave 3). Requests through
the admin web carry Vercel's proof header and count one more hop (measured 2).
Repeat the measurement after any platform change, as
[ADR-0087](../adr/0087-trust-forwarded-addresses-only-from-known-hosting-proxies.md)
describes.
