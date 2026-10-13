# Runbook: release the backend to production

How a backend commit reaches production on Northflank with its migrations
first ([ADR-0052](../adr/0052-run-backend-processes-from-one-deployable-package.md),
[ADR-0080](../adr/0080-separate-health-and-deployment-checks.md)). Until the
deploy workflow exists (EXT-008), every release is these steps by hand.

## What runs where

| Piece | Where | Notes |
| --- | --- | --- |
| API | Northflank project `default`, team `emma-pilates`, combined service `api`, region US Central (Council Bluffs) | Developer Sandbox, nf-compute-20 (0.2 vCPU, 512 MB), 1 instance; public at https://p01--api--mmps25fn9k9x.code.run, port 3100 HTTP |
| Migrations | Northflank manual job `migrate` | Same repository, branch, and `apps/backend/Dockerfile`; command `node_modules/.bin/prisma migrate deploy`; retry limit 0 |
| Database | Aiven project `emma-pilates-prod`, service `emma-pilates-prod-db`, database `emma` | Free plan, PostgreSQL 18, DigitalOcean US West (Santa Clara), 20 connections, 1 GB disk |
| Settings | Northflank secret group `production` (runtime, unrestricted) | Every variable both pieces share, plus the files `/etc/secrets/emma-ca.pem` (Aiven's CA) and `/etc/secrets/transfer-qr.png` |
| Admin web | Vercel project `emma-pilates-admin`, production alias https://emma-pilates-admin.vercel.app | `vercel.json` sends that host's `/api/v1` to the Northflank API |
| Monitoring | Better Stack «Production API readiness», every 3 minutes | Error tracking `emma-pilates-api` through `ERROR_REPORTING_DSN` |

CI is **off** on both the service and the job, so a push never deploys. CD is
on for the service, which means a finished build of `api` deploys at once.

## Release a commit

1. Merge the pull request; wait for CI on `main` to pass.
2. **Migrations first.** Northflank → Jobs → `migrate` → Latest commits → on
   the commit to release, **Rebuild** (or Builds → Start build). When the
   build is green, **Run**. Open the run's Logs: it must end with «All
   migrations have been successfully applied.» or «No pending migrations to
   apply.». If it fails, stop: the API is still on the previous release.
3. **Then the API.** Services → `api` → Latest commits → **Rebuild** on the
   same commit. CD deploys it when the build finishes; the readiness probe
   keeps the old instance serving until the new one is ready.
4. **Check the release** from the repository root:

   ```sh
   SMOKE_BASE_URL=https://p01--api--mmps25fn9k9x.code.run \
   SMOKE_EXPECTED_RELEASE=<full commit hash> \
   pnpm --filter @pilates/backend smoke
   ```

   It prints `"passed":true`. `/health/ready` reports the full commit hash as
   `release` because Northflank passes it to the image as `NF_GIT_SHA`.

Every migration must keep the previous API release working (expand first,
contract in a later release), because step 2 runs while that release still
serves traffic.

## Change a setting

Edit the `production` secret group (or the service's own Environment for
`AUTHENTICATION_LINK_BASE_URL` and `TRUSTED_PROXY_HOPS`), then **Restart**
the `api` service: the group's own Restart button only works for restricted
groups. A missing or local-default production setting stops the API at boot
with a `ZodError` in its Logs that names the variable.

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

`DATABASE_POOL_MAX=2` caps each of the API's eight pools, so the API holds at
most 16 of Aiven's 20 connections.

## Forwarded addresses

`TRUSTED_PROXY_HOPS=1` on the service: Northflank appends one
`X-Forwarded-For` entry to whatever the requester sent (measured 2026-10-13:
no header gave `forwardedFor` 1, two forged entries gave 3). Requests through
the admin web carry Vercel's proof header and count one more hop (measured 2).
Repeat the measurement after any platform change, as
[ADR-0087](../adr/0087-trust-forwarded-addresses-only-from-known-hosting-proxies.md)
describes.
