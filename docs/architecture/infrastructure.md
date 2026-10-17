# Infrastructure

What runs where, who owns each account, and where every setting lives.
Last verified **2026-10-17** (EXT-017 added staging and the promoted production release; EXT-016 retired the shared development environment; EXT-009; Expo/EAS added by REL-001; push added by NOT-002; domain and Email Routing added by EXT-014). This page holds **no secret values**:
it names each secret and the one place it is kept. How to release is in the
[production release runbook](../runbooks/production-release.md); why each
provider was chosen is in the ADRs linked below; prices and the order of the
remaining provider gates are in the [backlog](../implementation/BACKLOG.md)
(«Cost of each gate», «Order to open the gates»).

## At a glance

```text
                    PRODUCTION
 Browser ─► emma-pilates-admin.vercel.app
            (Vercel Hobby, production; Vercel deploys only main)
              │ /api/v1 + x-pilates-proxy-proof
              ▼
 Mobile ──► p01--api--mmps25fn9k9x.code.run
            (Northflank api, US Central) ─► R2
            Northflank worker (no ports)  ─► R2
            Northflank cron job backup    ─► R2 (daily pg_dump, 03:00 La Paz)
              │ TLS, Aiven CA verified
              ▼
            Aiven Free PostgreSQL 18
            emma-pilates-prod-db / emma
            (DigitalOcean US West)

 No shared development environment since 2026-10-17 (ADR-0091): local and CI
 cover development.

                    STAGING (EXT-017, ADR-0092; paused when idle)
 Browser ─► emma-pilates-admin-staging.vercel.app
              │ /api/v1 + staging's proxy proof
              ▼
 Mobile ──► p01--api--jmys6w5p8vlk.code.run   (staging builds of both apps)
            (Northflank team emma-pilates-staging, US Central) ─► R2
            Northflank worker (no ports)                       ─► R2
              │ TLS, Aiven CA verified
              ▼
            database emma_staging on the same Aiven service

 Cloudflare R2: private buckets emma-pilates-prod-images (uploaded images) and
               emma-pilates-prod-backups (daily database dumps)
 Better Stack: production readiness every 3 min, API error reports from the API, worker and
               database-backup heartbeats
 GitHub Actions: CI on every pull request and main, staging release after CI on main,
                production release started by hand (promotes a commit staging passed)
 Expo EAS: organization emma-pilates builds the development clients of both apps
           (iOS Simulator and Android); no store builds until gates 8–9
 Expo Push Service: the worker sends pushes with the push-sender robot's token;
           Android through Firebase Cloud Messaging (project emma-pilates),
           iOS through APNs once gate 9 brings the key
 Cloudflare domain emmapilatesstudio.com: Email Routing forwards soporte@ and
           no-responder@ to the owner's inbox; no web hostnames yet
```

## What we use from each provider

One line per provider, so you can tell at a glance which console to open and
what you will find there. Everything else each provider offers is unused.
Details are in the sections below.

| Provider | What we use | What it does for us | Not used (on purpose) |
| --- | --- | --- | --- |
| **GitHub** | Private repository `emma-pilates`; Actions (3 workflows); repository secrets; 4 repository variables; commit status `release/staging` | Holds the code; runs CI on every pull request and `main`; releases `main` to staging; promotes to production when started by hand | Branch protection (needs Pro), Packages, Pages |
| **Northflank** | Project `default` (US Central): services `api` and `worker`, jobs `migrate` and `backup` (daily cron), secret group `production` (15 variables, 2 files), API token `github-actions-release` with role `github-production-release`; logs and metrics | Builds the backend's Docker image and runs the **production API** and the **worker** (image processing, scheduled jobs); runs **database migrations** before each release and the **daily database dump** to R2; holds production settings and secrets | Its own CI (off: GitHub starts builds), addons (the database is Aiven), alert integrations (Better Stack alerts instead) |
| **Aiven** | One PostgreSQL 18 service, `emma-pilates-prod-db` (Free-1-1gb), holding the databases `emma` (production) and `emma_staging` (staging, its own role); its CA certificate | The **production and staging databases** | The $50 trial credit, point-in-time restore, any paid plan |
| **Vercel** | Projects `emma-pilates-admin` and `emma-pilates-admin-staging` (Hobby), each deployed only by its release workflow with the Vercel CLI (Git deployments off in `vercel.json`); `vercel.json` rewrites, `middleware.ts`, the error-envelope Function, Production environment variables; one project-scoped token per project | Hosts the **admin web** and forwards its `/api/v1` calls to the matching API with that environment's proxy proof | Vercel Pro, Git deployments and pull-request previews (off since ADR-0091 and ADR-0092), custom domain (gate 7) |
| **Cloudflare** | R2: private bucket `emma-pilates-prod-images` with a 3-day `pending/` lifecycle rule; private bucket `emma-pilates-staging-images` with the same rule and its own token `northflank-staging-images` (EXT-017); private bucket `emma-pilates-prod-backups` with 30-day `daily/` and 365-day `monthly/` rules and a 25-day lock on `daily/`; Account API tokens `northflank-production-images` (Object Read & Write, images bucket), `northflank-production-backups` (Object Read & Write, backup bucket), and `mac-backup-restore` (Object Read only, backup bucket) ; Registrar: domain `emmapilatesstudio.com` (since 2026-10-15, auto-renew on) with its DNS zone; Email Routing on that zone: addresses `soporte@` and `no-responder@` forwarded to the owner's verified Gmail, catch-all off | Stores **uploaded images** (receipts, profile photos, Promotions) and the **daily database dumps** for production; holds the project's **domain** and receives its **email** | Hostnames on the domain (WEB-021, LNK-001, a custom API or admin host), Email Sending (SendPulse sends instead, ADR-0031), public buckets and custom bucket domains, Workers, every other product |
| **Expo (EAS)** | Organization `emma-pilates` (Free) with projects `emma-pilates-client` and `emma-pilates-staff`; EAS Build with the `development` and `staging` profiles; one EAS-generated Android keystore per app; each app's EAS Update URL in `app.json`; each project's FCM V1 service account key (Android credentials); **Expo Push Service** with enhanced push security on; robot user `push-sender` (role Viewer) with the access token `northflank-production` | Builds the **mobile development clients** (iOS Simulator `.app`, Android `.apk`); delivers the **push notifications** the worker sends (NOT-002) and returns their tickets and receipts | Paid plans, EAS Submit and store builds (gates 8–9), published updates, EAS Workflows, EAS Hosting, Expo's observability |
| **Firebase** | One Spark (no-cost) project, `emma-pilates`, with the Android apps `com.emmapilates.client` («Emma Pilates»), `com.emmapilates.staff` («Emma Pilates Staff»), and their staging variants `com.emmapilates.client.staging` and `com.emmapilates.staff.staging` (EXT-017); Cloud Messaging; the Admin SDK service account `firebase-adminsdk-fbsvc@emma-pilates.iam.gserviceaccount.com`, whose key is held by EAS | Google's only delivery channel for Android push: Expo hands each Android push to FCM | Google Analytics and Gemini (both off at creation), every other Firebase product, the Firebase SDKs (the apps only carry the public `google-services.json`) |
| **Google Play Console** | Personal developer account «Daleney Labs» (ID `5688059300530668770`) owned by the user's Google account, identity verified 2026-10-15; draft apps `com.emmapilates.client` («Emma Pilates») and `com.emmapilates.staff` («Emma Pilates Staff»), Spanish (Latin America), free, Play App Signing accepted, automatic protection on | Distributes the **Android apps**: Internal testing first, then the Client app's closed test and production release (REL-002 to REL-007); Staff stays on a closed track | Paid apps and in-app purchases (earning money is off, which keeps the legal address private), organization verification, the developer website |
| **SendPulse** | Account signed in with the owner's Google account; free SMTP plan; profile under SendPulse's manual review since 2026-10-15 | Will send the **authentication emails** from `no-responder@emmapilatesstudio.com` (EXT-001) | Email marketing, chatbots, every other product |
| **Better Stack** | Uptime monitor «Production API readiness»; error tracking apps `emma-pilates-api`, `emma-pilates-admin`, and `emma-pilates-mobile` with the Incidents email integration; heartbeats «Worker heartbeat» and «Database backup» | **Alerts** you by email when production is down or the API reports an unexpected error | Log management, status pages, on-call |

Not created yet, in the order the gates open (backlog, «Order to open the
gates»): **Apple Developer** (gate 9). The domain (gate 7) arrived on
2026-10-15; SendPulse's account exists but sends nothing until EXT-001.

## Environments

| | Production | Staging | Local |
| --- | --- | --- | --- |
| API | Northflank `api` | Northflank team `emma-pilates-staging`, `api` (https://p01--api--jmys6w5p8vlk.code.run) | `pnpm dev:backend` on port 3100 |
| Worker | Northflank `worker` (no email until gate 7) | `worker` in the staging team | `node dist/src/worker-main.js` |
| Database | Aiven `emma-pilates-prod-db`, database `emma`, PostgreSQL 18 | the same Aiven service, database `emma_staging`, role `emma_staging` | Homebrew `postgresql@18` (18.6) on 5433: `emma_pilates`, `pilates_dev_sim`, `pilates_test_fixtures` |
| Admin web | https://emma-pilates-admin.vercel.app | https://emma-pilates-admin-staging.vercel.app | `pnpm dev:admin` on 5173 |
| Mobile | store builds (gates 8–9) | `staging` EAS profile: `com.emmapilates.client.staging`, `com.emmapilates.staff.staging` | development builds and Metro |
| Data | Real; one Administrator (Fernando Daleney) since 2026-10-14, no Clients; dumped daily to R2, restore drill passed 2026-10-14 | Synthetic only, never copied from production; not backed up | Fixtures |
| `NODE_ENV` | `production` | `production` (errors tagged `staging` through `ERROR_REPORTING_ENVIRONMENT`) | `development` |
| Email | none: the worker leaves authentication emails queued until EXT-001 | none, as production | `LocalEmailCapture` under `apps/backend/.data/email-capture` |
| Images | Cloudflare R2 `emma-pilates-prod-images` (`OBJECT_STORAGE=s3`) | R2 `emma-pilates-staging-images` | `apps/backend/.data/uploads` |
| Release | started by hand (`release production`), promotes a commit staging passed, [runbook](../runbooks/production-release.md) | automatic after CI on `main` (`release staging`) | — |
| Running | always | paused when nobody is testing (Pay as you go) | — |

CI runs disposable databases per job (`postgres:18-alpine`). The shared
development environment (Render and Neon, with pull-request previews) was
retired on 2026-10-17 ([ADR-0091](../adr/0091-retire-the-shared-development-environment.md));
staging, which mirrors production, arrived the same day
([ADR-0092](../adr/0092-release-to-staging-before-promoting-to-production.md)).

Every environment runs PostgreSQL 18: production (Aiven 18.6), CI
(`postgres:18-alpine`), the integration suite's Docker fallback
(`postgres:18-alpine`), and local (Homebrew 18.6 on port 5433, beside an older
PostgreSQL on 5432 that other projects on the Mac use; BE-019).
The schema tests expect PostgreSQL 18's SQLSTATE 23001 for a `RESTRICT`
violation and no longer accept older servers' 23503.

## Accounts

Every account belongs to the project owner and is shared with no one else.

| Provider | Account / team | Plan | Card on file | Used for |
| --- | --- | --- | --- | --- |
| GitHub | `DaleneyRuben`, repository `emma-pilates` (private) | Free | — | Code, CI, deploy automation; `main` protected by convention only |
| Northflank | team `emma-pilates`, project `default` | Developer Sandbox | Yes, for verification only | Production API, worker, migration job, and backup job |
| Northflank | team `emma-pilates-staging` (same login), project `default` | Pay as you go: about $2 a month paused when idle, about $12 running all month; billing alert at $3 | Yes, charged monthly | Staging API, worker, and migration job (EXT-017) |
| Cloudflare | `daleney.fernando@…`, account ID `1121636a866de46f92544db1a7ebe310` | Free; R2 subscription (free allowance) since 2026-10-14; domain `emmapilatesstudio.com` registered 2026-10-15 for $10.46, expires 2027-10-15, auto-renew on (the `.com` price becomes $11.17 on 2026-11-01) | Yes | R2 image storage and database dumps; the domain, its DNS, and Email Routing |
| Aiven | organization «My Organization», project `emma-pilates-prod` | Free (a $50 trial runs beside it, unused) | No | Production database |
| Vercel | `fernando-daleney-s-projects` (team ID `team_bre2bUZY2GoIVshYTqLctJEs`), projects `emma-pilates-admin` (`prj_ioO6RZptzJICWAM0zVwg3uN19bd8`) and `emma-pilates-admin-staging` (`prj_Tga3WGsCOMB1val88ri5xR0v40a4`) | Hobby (200 projects, 100 deployments a day), also for production by decision | — | Admin web production and staging, `/api/v1` proxy |
| Better Stack | team `t614177` | Free | No | Uptime, error tracking, heartbeat, email alerts |
| Expo | user `daleneyfernando` (Google sign-in), organization `emma-pilates`; projects `emma-pilates-client` (`c9271277-f815-4e36-97db-63a584a85957`) and `emma-pilates-staff` (`885d3272-da0a-49f7-b8cd-33092de7662a`) | Free: 15 iOS and 15 Android builds a month | No | Mobile development builds since 2026-10-14 (gate 6); push since NOT-002; updates later |
| Firebase | the user's Google account, project `emma-pilates` | Spark (no cost) | No | Android push delivery (FCM) since NOT-002 |
| Google Play Console | developer «Daleney Labs» (personal), account ID `5688059300530668770`, owned by `daleney.fernando@…` | $25 once, paid 2026-10-15 | Yes (Google payments profile) | Android distribution since 2026-10-15 (gate 8) |
| SendPulse | Google sign-in as `daleney.fernando@…`; account email `soporte@emmapilatesstudio.com` (verified 2026-10-15) | SMTP Free: 12,000 emails a month, 50 an hour, 2 sender addresses | No | Authentication email once EXT-001 finishes; SMTP profile under manual review since 2026-10-15 |
| Apple | not created yet | — | — | Gate 9 |

## Production in detail

### Northflank

- **Region:** US Central (Council Bluffs). Free projects can use only US
  Central or Europe West, and a project's region cannot change.
- **Service `api`:** combined service (builds and runs), repository
  `DaleneyRuben/emma-pilates`, branch `main`, Dockerfile
  `/apps/backend/Dockerfile`, build context `/`; **CI off** (pushes never
  build; the `release production` workflow starts builds), **CD on** (a
  finished build deploys). Plan nf-compute-20
  (0.2 vCPU, 512 MB, the largest free plan), 1 instance, uses about 290 MB.
  Port 3100 public HTTP as `p01` → https://p01--api--mmps25fn9k9x.code.run.
  Readiness probe `/health/ready` (delay 10 s, period 10 s, timeout 5 s, 3
  failures); liveness probe `/health/live` (delay 60 s, period 10 s, timeout
  3 s, 3 failures). Service variables: `AUTHENTICATION_LINK_BASE_URL`
  (its own HTTPS address until the domain exists) and `TRUSTED_PROXY_HOPS=1`.
- **Service `worker`:** combined service built from the same repository,
  branch, Dockerfile, and context as `api`, start command
  `node dist/src/worker-main.js`, **no ports**, no health probes (the Better
  Stack heartbeat watches it), nf-compute-20, 1 instance, CI off, CD on.
  Service variables: `AUTHENTICATION_LINK_BASE_URL` (same value as `api`'s;
  the worker crash-loops on a `ZodError` without it) and `WORKER_HEARTBEAT_URL`.
  It runs every job except authentication email, which stays queued until
  EXT-001 and is logged once as `authentication_email_disabled`. The release
  workflow builds it after `api` because the repository variable
  `NORTHFLANK_WORKER_SERVICE_ID` is `worker`.
- **Job `migrate`:** manual job, same repository, branch, and Dockerfile
  (Northflank cannot point a job at a combined service's image), nf-compute-20,
  command `node_modules/.bin/prisma migrate deploy`, retry limit 0, CI off,
  CD on (a finished build becomes the image the next run uses).
- **Job `backup`:** cron job (EXT-009), same repository, branch `main`, and
  Dockerfile, built with the build argument `POSTGRESQL_CLIENT_MAJOR=18` so
  the image carries `pg_dump` 18 (the other images do not); schedule
  `0 7 * * *` UTC (03:00 La Paz), concurrency Forbid, time limit 1800 s,
  retry limit 1, run on image change Never; command
  `node dist/src/database-backup-main.js`; nf-compute-20; CI off, CD on (the
  release workflow builds it after the worker because the repository variable
  `NORTHFLANK_BACKUP_JOB_ID` is `backup`). Job variables:
  `BACKUP_STORAGE_ENDPOINT`, `BACKUP_STORAGE_BUCKET`,
  `BACKUP_STORAGE_ACCESS_KEY_ID`, `BACKUP_STORAGE_SECRET_ACCESS_KEY`,
  `BACKUP_HEARTBEAT_URL`; `DATABASE_URL` and the CA come from `production`.
  Each run takes under 30 s and one database connection
  ([backups runbook](../runbooks/backups-and-restore-drills.md)).
- **API token `github-actions-release`:** team-level, role
  `github-production-release` (project `default` only; Services → General
  Read and Update; Jobs → General Read, Update, Run Job), 1-year lifetime
  from 2026-10-14. It is the GitHub secret `NORTHFLANK_API_TOKEN`; rotation
  is in the [runbook](../runbooks/production-release.md#the-deploy-tokens).
- **Secret group `production`:** runtime scope, unrestricted (every service
  and job in the project receives it). Holds everything in the «Settings»
  table below marked Northflank, plus two files:
  `/etc/secrets/emma-ca.pem` (Aiven's CA certificate, public) and
  `/etc/secrets/transfer-qr.png` (the studio's transfer QR, binary).
- **Release identifier:** Northflank passes the built commit as the build
  argument `NF_GIT_SHA`; the Dockerfile turns it into `RELEASE_ID`, which
  `/health/ready` and every log line report.
- **Free allowance:** 2 services, 2 jobs, 1 addon, up to $20 a month of
  resources. In use: 2 services (`api`, `worker`), 2 jobs (`migrate`,
  `backup`), ~$10.80 of resources plus well under a cent a day for the
  backup run. No service or job slot is left.

### Aiven

- Service `emma-pilates-prod-db`, plan Free-1-1gb: 1 CPU, 1 GB RAM, 1 GB
  disk, PostgreSQL 18.6, end of life 2030-11-07. Aiven chose the cloud:
  DigitalOcean, Santa Clara (US West), about 40 ms from the API per query.
  Aiven may move a free service, power it off after a notice when idle, and
  keeps one disaster-recovery backup without point-in-time restore.
- Host `emma-pilates-prod-db-emma-pilates-prod.b.aivencloud.com`, port 20680,
  user `avnadmin`, database `emma`, 20 connections, TLS with Aiven's private
  CA (download it from Overview → Connection information → CA certificate).
- `DATABASE_URL` format and how to build it without showing the password:
  [release runbook](../runbooks/production-release.md#database-connection).

### Cloudflare R2

- Bucket `emma-pilates-prod-images`: Standard storage class, automatic
  location (Eastern North America), no jurisdiction, **public access
  disabled**. Objects: `pending/<purpose>/<id>` (raw uploads, deleted once
  processed), `private/<purpose>/<id>/<variant>` (rebuilt images), and
  `public/promotion/…` (published Promotion copies, still served through the
  API until a custom domain exists).
- Lifecycle rules: `delete-stale-pending-uploads` deletes objects under
  `pending/` 3 days after upload (the same three days the application waits,
  ADR-0089); Cloudflare's default rule aborts unfinished multipart uploads
  after 7 days.
- Access: Account API token `northflank-production-images`, Object Read &
  Write on this bucket only, no expiry, no IP filter. Its Access Key ID and
  Secret Access Key live only in Northflank's `production` group. To rotate:
  R2 → API Tokens → create a new one with the same settings, update both
  values in Northflank, restart `api` and `worker`, then delete the old token.
- Endpoint: the account's default S3 API,
  `https://1121636a866de46f92544db1a7ebe310.r2.cloudflarestorage.com`.
- Uploads reach R2 only through the API (ADR-0088); the bucket needs no CORS.
- Bucket `emma-pilates-prod-backups` (EXT-009): Standard, automatic location
  (Eastern North America), **public access disabled**. Objects:
  `daily/emma-<UTC time>.dump` (one custom-format `pg_dump` per day, written
  once, with `sha256` and `row-counts` metadata) and
  `monthly/emma-<La Paz month>.dump` (overwritten by each run, so the month's
  last dump stays). Lifecycle rules `delete-daily-dumps-after-30-days` and
  `delete-monthly-dumps-after-365-days`; bucket lock
  `protect-daily-dumps-25-days` (nothing under `daily/` can be deleted or
  overwritten for 25 days); Cloudflare's default multipart-abort rule. First
  dump 2026-10-14: 286,411 bytes.
- Access to the backups: token `northflank-production-backups` (Object Read &
  Write on this bucket only, no expiry; R2 has no write-only permission) lives
  only in the `backup` job's variables, so `api` and `worker` never hold it;
  token `mac-backup-restore` (Object Read only on this bucket, no expiry) is
  the owner's, read at hidden prompts for the weekly check and the drills.
  Rotate the same way as the images token, then update the `backup` job.

### Vercel (production side)

- `vercel.json` routes `/api/v1/:path*` on the host
  `emma-pilates-admin.vercel.app` to the Northflank API (no other host gets
  an API; the staging host has its own rule) and every non-API path to
  `index.html`; `git.deploymentEnabled` is `false`, so Vercel deploys nothing
  from Git: no previews (ADR-0091) and no merge deployments (ADR-0092).
- `middleware.ts` adds `x-pilates-proxy-proof` from `ADMIN_WEB_PROXY_SECRET`
  to every forwarded `/api/v1` request (ADR-0087).
- Production is deployed only by the `release production` workflow
  (`vercel deploy --prebuilt --prod` of the promoted commit).
- A production deployment opened through any address other than
  `emma-pilates-admin.vercel.app` (its per-deployment URL, the `git-main`
  alias) answers `404` on `/api/v1`. When the domain arrives (gate 7), its
  host must join the production rule.
- `src/vercel/compiled-alone.spec.ts` fails CI when `middleware.ts` or a
  Function under `api/` imports a local file, which Vercel's separate
  compilation cannot resolve.

## Staging in detail

[ADR-0092](../adr/0092-release-to-staging-before-promoting-to-production.md);
how to release, pause, and resume it is in the
[runbook](../runbooks/production-release.md).

- **Northflank team `emma-pilates-staging`** (same login as production, Pay
  as you go: the free Sandbox is once per login), project `default`, US
  Central. Service `api`: combined, `main`, `/apps/backend/Dockerfile`,
  context `/`, nf-compute-20, 1 instance, CI off, CD on, port 3100 public
  HTTP as `p01` → https://p01--api--jmys6w5p8vlk.code.run, readiness
  `/health/ready` (10/10/5/3) and liveness `/health/live` (60/10/3/3),
  service variables `TRUSTED_PROXY_HOPS=1` and `AUTHENTICATION_LINK_BASE_URL`
  (its own address). Service `worker`: combined, same source, nf-compute-20,
  no ports, no probes, command `node dist/src/worker-main.js`, variable
  `AUTHENTICATION_LINK_BASE_URL`. Job `migrate`: manual, same source,
  nf-compute-20, command `node_modules/.bin/prisma migrate deploy`, retry
  limit 0, run on image change Never. Builds use nf-compute-400-16, the
  smallest builder offered (about a cent per build). No `backup` job: the
  data is synthetic.
- **Secret group `staging`** (runtime, unrestricted): `DATABASE_URL`
  (`emma_staging` on the Aiven service, verify-full with the CA),
  `DATABASE_POOL_MAX=2`, fresh authentication keys with key ID
  `northflank-staging-v1`, `ADMIN_WEB_TRUSTED_ORIGINS` (the staging admin
  web), its own `ADMIN_WEB_PROXY_SECRET`, `ERROR_REPORTING_DSN` (the same
  `emma-pilates-api` application) with `ERROR_REPORTING_ENVIRONMENT=staging`,
  the `OBJECT_STORAGE_*` settings for `emma-pilates-staging-images`, and
  `TRANSFER_QR_IMAGE_PATH`; files `/etc/secrets/emma-ca.pem` and
  `/etc/secrets/transfer-qr.png`. No `EXPO_ACCESS_TOKEN` yet: staging sends
  no push until a staging robot token is added.
- **API token `github-actions-staging-release`:** role
  `github-staging-release` (project `default`; Services → General Read and
  Update; Jobs → General Read, Update, Run Job), 1 year from 2026-10-17;
  GitHub secret `NORTHFLANK_STAGING_API_TOKEN`.
- **Aiven:** database `emma_staging` owned by the role `emma_staging`
  (connection limit 8), created on 2026-10-17; `CONNECT` on `emma`,
  `defaultdb`, and `emma_staging` is revoked from `PUBLIC`, so the staging
  role cannot open production's database (checked the same day; `avnadmin`
  owns `emma` and still connects). Aiven cannot rename a service, so the
  shared service keeps its `-prod-db` name.
- **Cloudflare R2:** bucket `emma-pilates-staging-images` (Standard,
  automatic location, private, lifecycle rule `delete-stale-pending-uploads`
  after 3 days) and token `northflank-staging-images` (Object Read & Write on
  that bucket only).
- **Vercel:** project `emma-pilates-admin-staging` (root `apps/admin-web`,
  Vite, Production variables `ENABLE_EXPERIMENTAL_COREPACK=1` and staging's
  `ADMIN_WEB_PROXY_SECRET`); `vercel.json` routes its host's `/api/v1` to the
  staging API; token `github-actions-staging-release` scoped to the project.
- **Expo EAS:** both projects' `preview` environment holds
  `EXPO_PUBLIC_API_URL` (the staging API) and the mobile DSN; the `staging`
  build profile sets `APP_VARIANT=staging` (channel `staging`, internal
  Android `.apk`), which `app.config.js` turns into the `.staging` IDs, the
  «Staging» name, and the marked icons. Each staging app has its own
  EAS-generated keystore.
- **Not used for staging, by decision:** Better Stack uptime monitors and
  heartbeats (paused most of the time; each release's smoke check proves
  it), backups, email, the domain.

## Development in detail

There is no shared development host since 2026-10-17
([ADR-0091](../adr/0091-retire-the-shared-development-environment.md)).
Development runs on the Mac (the [testing guide](../testing-guide.md)) and in
CI's disposable databases.

- **Expo EAS:** each app's `eas.json` builds every profile on Node 24.13.0
  and the workspace's pnpm 11.19.0 (a shared `base` profile). EAS uploads the
  whole repository (tracked files only, about 7 MB compressed) and installs it
  from the root lockfile, so the workspace packages resolve as they do
  locally. A config plugin listed in an app's `app.json` must be a direct
  dependency of that app (`expo-secure-store` is): EAS resolves plugins
  without the `NODE_PATH` that pnpm's bin shims add. The `development`
  profile builds a development client with `ios.simulator: true`, so it
  installs on the Simulators without an Apple account; Android builds are
  internal `.apk` files signed with the EAS-held keystore. The Mac's `eas`
  CLI must be logged in as `daleneyfernando` (`eas whoami`); the same Mac
  also has a work Expo login, so check before every `eas` command.

## Settings and secrets: where each one lives

Values never go in the repository or a chat. «Mac» means the user's own
`apps/backend/.env`, which Git ignores.

| Setting | Production | EAS development | Local / Mac | Notes |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Northflank `production` | — | `.env` (local) | Reset in Aiven to rotate |
| `DATABASE_POOL_MAX` | Northflank `production` (4) | default 10 | default 10 | Most connections per process (API or worker), split between its one Prisma and one pg-boss pool; Aiven allows 20 (BE-018) |
| `AUTHENTICATION_EMAIL_DIGEST_KEY` | Northflank `production` | — | `.env` | Fresh per environment; rotation plan still to write |
| `AUTHENTICATION_LINK_ENCRYPTION_KEY` | Northflank `production` | — | `.env` | 32 random bytes, base64 |
| `AUTHENTICATION_LINK_ENCRYPTION_KEY_ID` | Northflank `production` (`northflank-prod-v1`) | — | `local-development-v1` | |
| `AUTHENTICATION_LINK_BASE_URL` | Northflank `api` **and** `worker` services (the API's address) | default | default | The link domain arrives with gate 7 |
| `ADMIN_WEB_TRUSTED_ORIGINS` | Northflank `production` (`https://emma-pilates-admin.vercel.app`) | — | `http://localhost:5173` | |
| `ADMIN_WEB_PROXY_SECRET` | Northflank `production` **and** Vercel Production | — | unset | Same value on both sides |
| `TRUSTED_PROXY_HOPS` | Northflank `api` service (1) | — | 0 | Measured, never assumed (ADR-0087) |
| `ERROR_REPORTING_DSN` | Northflank `production` (the API and the worker) | — | commented in `.env` | Write-only; `emma-pilates-api`, one Better Stack application for every environment and both processes |
| `VITE_ERROR_REPORTING_DSN` | Vercel Production (Config, readable) | unset | unset | `emma-pilates-admin`'s DSN; Vite inlines it in the browser bundle, so it is public by design and can only send errors; a change needs a redeploy |
| `EXPO_PUBLIC_ERROR_REPORTING_DSN` | EAS environment variables `preview` and `production`, each app's project (plain text, set 2026-10-15) | same, `development` (set) | unset (a local receiver for Test 47) | `emma-pilates-mobile`'s DSN (EXT-013); Expo inlines it in the bundle at build or update time, so it is public by design and can only send errors |
| `SENTRY_URL`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | EAS environment variables `preview` and `production`, each app's project (the token as a secret) | — | never | The source-map upload of release builds (EXT-013): Better Stack's upload endpoint, team ID, and `emma-pilates-mobile` ID from the application's Advanced settings, and a Telemetry API token, which is account-wide; without them a build succeeds and uploads nothing |
| `WORKER_HEARTBEAT_URL` | Northflank `worker` service | not set | commented in `.env` | Better Stack «Worker heartbeat» |
| `EXPO_ACCESS_TOKEN` | Northflank `production` | unset | `.env` | The `push-sender` robot's token `northflank-production` (Viewer). Enhanced push security is on for `emma-pilates`, so the worker cannot push without it; to rotate, create a new token on the robot, replace the value, restart `worker`, then revoke the old one |
| FCM V1 service account key | EAS, each project's Android credentials | same | never on the Mac | Generated in Firebase (Project settings → Service accounts); to rotate, generate a new key, upload it to both EAS projects, then delete the old key in Google Cloud |
| `OBJECT_STORAGE` | Northflank `production` (`s3`) | default (`local`) | default (`local`) | ADR-0088; production refuses `local` |
| `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_BUCKET` | Northflank `production` | unset | unset (MinIO for Test 42) | Default R2 endpoint, bucket `emma-pilates-prod-images` |
| `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY` | Northflank `production` | unset | unset | R2 token `northflank-production-images`; rotation under «Cloudflare R2» |
| `NORTHFLANK_WORKER_SERVICE_ID` | GitHub repository **variable** (`worker`) | — | — | Lets the release workflow rebuild the worker; empty skips it |
| `NORTHFLANK_BACKUP_JOB_ID` | GitHub repository **variable** (`backup`) | — | — | Lets the release workflow rebuild the backup image; empty skips it |
| `BACKUP_STORAGE_ENDPOINT`, `BACKUP_STORAGE_BUCKET` | Northflank `backup` job | — | unset (MinIO for Test 43) | Default R2 endpoint, bucket `emma-pilates-prod-backups` |
| `BACKUP_STORAGE_ACCESS_KEY_ID`, `BACKUP_STORAGE_SECRET_ACCESS_KEY` | Northflank `backup` job | — | unset; the restore token is typed at hidden prompts | R2 token `northflank-production-backups` |
| `BACKUP_HEARTBEAT_URL` | Northflank `backup` job | — | unset | Better Stack «Database backup»; production refuses to start without it |
| `BACKUP_PG_DUMP_PATH` | default `pg_dump` (the image's 18) | — | `/opt/homebrew/opt/postgresql@18/bin/pg_dump` | |
| `POSTGRESQL_CLIENT_MAJOR` | Northflank `backup` job **build argument** (`18`) | — | — | Installs `pg_dump` in the backup image only |
| `TRANSFER_QR_IMAGE_PATH` | Northflank `production` (`/etc/secrets/transfer-qr.png`) | default | default (`.data/transfer-qr.png`) | The only transfer instruction since PAY-003; the three bank-detail variables were deleted from `production` on 2026-10-14 after release `5642443a` |
| `NODE_ENV` | `production` (image default) | — | `.env` | |
| `RELEASE_ID` | from `NF_GIT_SHA` at build | unset (`local`) | unset | |
| `ENABLE_EXPERIMENTAL_COREPACK` | Vercel Production | — | — | Lets Vercel use the pinned pnpm |
| `NORTHFLANK_API_TOKEN` | GitHub repository secret | — | — | `release production` workflow; expires around 2027-10-14 |
| `NORTHFLANK_STAGING_API_TOKEN` | GitHub repository secret | — | — | `release staging` workflow; expires around 2027-10-17 |
| `VERCEL_ORG_ID`, `VERCEL_PRODUCTION_PROJECT_ID`, `VERCEL_PRODUCTION_TOKEN` | GitHub repository secrets | — | — | `release production` deploys the admin web; the token is scoped to `emma-pilates-admin` |
| `VERCEL_STAGING_PROJECT_ID`, `VERCEL_STAGING_TOKEN` | GitHub repository secrets | — | — | `release staging` deploys the staging admin web; the token is scoped to `emma-pilates-admin-staging` |
| `STAGING_API_URL`, `STAGING_NORTHFLANK_WORKER_SERVICE_ID` | GitHub repository **variables** | — | — | The staging API and worker; the staging workflow does nothing while `STAGING_API_URL` is empty |
| `ERROR_REPORTING_ENVIRONMENT` | unset (reports `production`) | — | unset | Northflank `staging` group (`staging`); names the environment in error reports (EXT-017) |
| Staging settings | — | — | — | Northflank `staging` group, listed under «Staging in detail» |

## Automation

- **`.github/workflows/ci.yml`:** every pull request and push to `main`;
  quality, unit, contract, e2e, and integration jobs per surface, the
  database jobs on `postgres:18-alpine`. Deploys nothing.
- **`.github/workflows/release-staging.yml`:** after `ci` passes on a push
  to `main` (or by hand with a commit), releases it to the staging team
  (migrate, `api` readiness, `worker`, smoke check), deploys the staging
  admin web with the Vercel CLI, and records the commit status
  `release/staging` (EXT-017).
- **`.github/workflows/release-production.yml`:** started by hand only;
  `pnpm promotion` picks the commit staging runs (or the one named) and
  refuses one without a successful `release/staging` status or behind
  production; then builds and runs Northflank's `migrate` job, builds `api`,
  waits for `/health/ready` to report the commit, builds `worker` and waits
  for its rollout (EXT-002), builds the `backup` job without running it
  (EXT-009), runs the smoke check (EXT-008), and deploys the production
  admin web with the Vercel CLI.
- **Deployments:** only these two workflows deploy. Vercel's Git
  deployments are off in `vercel.json`, and Northflank's CI is off on every
  service and job.

## Monitoring

- **Better Stack «Production API readiness»:** `/health/ready` on Northflank
  every 3 minutes, 3-minute confirmation, four regions, email alerts; verified
  to fire and recover on 2026-10-13.
- **Better Stack error tracking `emma-pilates-api`:** the API and the
  production worker report unexpected failures (no messages, no request or
  job data) when `ERROR_REPORTING_DSN` is set, tagged `service` `api` or
  `worker`; the worker adds `job` (the sweep, or `uploads.finalize.v1`).
  Proved from production on 2026-10-14 (EXT-011).
- **Better Stack error tracking `emma-pilates-admin`** (React, US region):
  the production admin web reports uncaught errors, unhandled rejections,
  and render errors (no message, URL, user, or breadcrumbs; 4xx answers
  never) when Vercel Production has `VITE_ERROR_REPORTING_DSN`; stacks are
  minified, no source maps. The browser posts to its own origin,
  `/api/monitoring/envelope` (EXT-012), so Brave Shields and ad blockers let
  the events through; the Vercel Function `apps/admin-web/api/monitoring/envelope.ts`
  reads the same variable at runtime and forwards only envelopes addressed
  to that DSN (403 otherwise, 404 without it), only the body, to Better
  Stack's ingest. Before EXT-012, Shields blocked the direct send
  (`ERR_BLOCKED_BY_CLIENT`).
- **Incidents integration** (team-wide, «Any application»): emails «Your
  team» when a new error occurs or one is automatically re-opened.
- **Better Stack «Worker heartbeat»:** the worker pings every 30 seconds,
  but only while it makes progress: the oldest ready `uploads.finalize.v1`
  job is under 5 minutes old (the authentication email queue joins once
  email is enabled) and every sweep succeeded within twice its interval
  plus 2 minutes (ADR-0066, EXT-011). Otherwise it logs
  `worker_progress_stalled` with the reasons and the monitor alerts after
  its 1-minute grace. Expected every minute, active since 2026-10-14.
- **Better Stack «Database backup»:** the `backup` job pings after each dump
  is stored, or `…/fail` when a step fails or the dump is under half the
  previous one; expected every day with a 2-hour grace, Up since the first run
  on 2026-10-14. The weekly bucket check is `pnpm backup:check` from the Mac.
- **Northflank** shows logs, CPU and memory, and restarts for both services,
  and holds `api` out of traffic until `/health/ready` answers; it sends no
  alerts. The worker has no probes: Northflank restarts it only when its
  process exits, and the heartbeat catches anything else.
- **Northflank:** logs (JSON lines), metrics, container restarts.
- **Better Stack error tracking `emma-pilates-mobile`** (React Native, US
  region, created 2026-10-15): both
  apps report uncaught errors, unhandled rejections, and render errors a
  screen's boundary caught (no message, user, breadcrumbs, device context,
  screenshots, sessions, or tracing; 4xx answers never), tagged `service`
  `client-mobile` or `staff-mobile`, when the bundle has
  `EXPO_PUBLIC_ERROR_REPORTING_DSN` (EXT-013). The environment is the build's
  update channel, `development` under Metro. Release builds upload their
  JavaScript source maps, matched by debug id, when the `SENTRY_*` variables
  are set; Better Stack takes no dSYMs or ProGuard mappings, so native
  frames stay unsymbolicated.
- Not yet: source maps for the admin web (declined: the upload needs an
  account-wide Better Stack token on Vercel).

## Known gaps

- No email (gate 7): Clients cannot register or recover passwords in
  production; the first Administrator's link was read from the `api` shell.
- The domain only receives email so far: production still uses the providers'
  hostnames, and replies sent from the owner's Gmail show that address until
  Gmail «Send mail as» `soporte@` goes through SendPulse's SMTP (EXT-001).
- iOS push needs an APNs key (gate 9). Until then iOS installations register,
  but Expo answers their pushes with `InvalidCredentials`, which the worker
  records as a failed delivery; the Simulators are verified with
  `xcrun simctl push` (testing guide, Test 46).
- The FCM key belongs to Firebase's Admin SDK service account, which has more
  rights than sending messages; a dedicated service account with only the
  Firebase Cloud Messaging role would be narrower.
- The Android keystores live only on EAS: download a copy
  (`eas credentials`, Android, «Download») before the first store build
  (gate 8), so release credentials stay recoverable (ADR-0038).

## Keeping this current

Update this page in the same pull request as any change to an account, plan,
region, service, secret's location, workflow, or monitor, and change the
«Last verified» date when it is re-checked.
