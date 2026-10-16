# Infrastructure

What runs where, who owns each account, and where every setting lives.
Last verified **2026-10-15** (EXT-009; Expo/EAS added by REL-001; push added by NOT-002; domain and Email Routing added by EXT-014). This page holds **no secret values**:
it names each secret and the one place it is kept. How to release is in the
[production release runbook](../runbooks/production-release.md); why each
provider was chosen is in the ADRs linked below; prices and the order of the
remaining provider gates are in the [backlog](../implementation/BACKLOG.md)
(«Cost of each gate», «Order to open the gates»).

## At a glance

```text
                    PRODUCTION                                   DEVELOPMENT (shared)
 Browser ─► emma-pilates-admin.vercel.app          Browser ─► emma-pilates-admin-git-<branch>-….vercel.app
            (Vercel Hobby, production)                        (Vercel Hobby, preview, Vercel Authentication)
              │ /api/v1 + x-pilates-proxy-proof                 │ /api/v1 + x-pilates-proxy-proof
              ▼                                                 ▼
 Mobile ──► p01--api--mmps25fn9k9x.code.run         emma-pilates-dev-api.onrender.com ◄── Mobile (Expo Go)
 (none yet) (Northflank api, US Central) ─► R2      (Render Free, Ohio, sleeps when idle)
            Northflank worker (no ports)  ─► R2       images on local disk, no worker
            Northflank cron job backup    ─► R2 (daily pg_dump, 03:00 La Paz)
              │ TLS, Aiven CA verified                          │ TLS
              ▼                                                 ▼
            Aiven Free PostgreSQL 18                          Neon Free PostgreSQL 18
            emma-pilates-prod-db / emma                       emma-pilates-dev / pilates_dev
            (DigitalOcean US West)                            (AWS US East 2, Ohio)

 Cloudflare R2: private buckets emma-pilates-prod-images (uploaded images) and
               emma-pilates-prod-backups (daily database dumps)
 Better Stack: production readiness every 3 min, API error reports from both APIs, worker and
               database-backup heartbeats
 GitHub Actions: CI on every pull request and main, production release after CI on main,
                 preview cleanup, preview-origin registration
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
| **GitHub** | Private repository `emma-pilates`; Actions (4 workflows); 4 repository secrets; 2 repository variables | Holds the code; runs CI on every pull request and `main`; starts the production release; registers and cleans up admin-web previews | Branch protection (needs Pro), Packages, Pages |
| **Northflank** | Project `default` (US Central): services `api` and `worker`, jobs `migrate` and `backup` (daily cron), secret group `production` (15 variables, 2 files), API token `github-actions-release` with role `github-production-release`; logs and metrics | Builds the backend's Docker image and runs the **production API** and the **worker** (image processing, scheduled jobs); runs **database migrations** before each release and the **daily database dump** to R2; holds production settings and secrets | Its own CI (off: GitHub starts builds), addons (the database is Aiven), alert integrations (Better Stack alerts instead) |
| **Aiven** | One PostgreSQL 18 service, `emma-pilates-prod-db` (Free-1-1gb); its CA certificate | The **production database** | The $50 trial credit, point-in-time restore, any paid plan |
| **Vercel** | Project `emma-pilates-admin` (Hobby): production deploys, one preview per pull request, Vercel Authentication on previews, `vercel.json` rewrites, `middleware.ts`, 2 environment variables | Hosts the **admin web** (production and previews) and forwards its `/api/v1` calls to the right API with the proxy proof | Vercel Pro, custom domain (gate 7), serverless functions beyond the middleware |
| **Render** | One Free web service, `emma-pilates-dev-api` (native Node, auto-deploy from `main`); an API key for the `preview-origins` workflow | Runs the **shared development API** that previews and Expo Go talk to | Workers, Render databases, paid plans |
| **Neon** | One Free project, `emma-pilates-dev`: one branch, database `pilates_dev`, direct connection | The **shared development database** | Connection pooling, per-pull-request branches |
| **Cloudflare** | R2: private bucket `emma-pilates-prod-images` with a 3-day `pending/` lifecycle rule; private bucket `emma-pilates-prod-backups` with 30-day `daily/` and 365-day `monthly/` rules and a 25-day lock on `daily/`; Account API tokens `northflank-production-images` (Object Read & Write, images bucket), `northflank-production-backups` (Object Read & Write, backup bucket), and `mac-backup-restore` (Object Read only, backup bucket) ; Registrar: domain `emmapilatesstudio.com` (since 2026-10-15, auto-renew on) with its DNS zone; Email Routing on that zone: addresses `soporte@` and `no-responder@` forwarded to the owner's verified Gmail, catch-all off | Stores **uploaded images** (receipts, profile photos, Promotions) and the **daily database dumps** for production; holds the project's **domain** and receives its **email** | Hostnames on the domain (WEB-021, LNK-001, a custom API or admin host), Email Sending (SendPulse sends instead, ADR-0031), public buckets and custom bucket domains, Workers, every other product |
| **Expo (EAS)** | Organization `emma-pilates` (Free) with projects `emma-pilates-client` and `emma-pilates-staff`; EAS Build with the `development` profile; one EAS-generated Android keystore per app; each app's EAS Update URL in `app.json`; each project's FCM V1 service account key (Android credentials); **Expo Push Service** with enhanced push security on; robot user `push-sender` (role Viewer) with the access token `northflank-production` | Builds the **mobile development clients** (iOS Simulator `.app`, Android `.apk`); delivers the **push notifications** the worker sends (NOT-002) and returns their tickets and receipts | Paid plans, EAS Submit and store builds (gates 8–9), published updates, EAS Workflows, EAS Hosting, Expo's observability |
| **Firebase** | One Spark (no-cost) project, `emma-pilates`, with the Android apps `com.emmapilates.client` («Emma Pilates») and `com.emmapilates.staff` («Emma Pilates Staff»); Cloud Messaging; the Admin SDK service account `firebase-adminsdk-fbsvc@emma-pilates.iam.gserviceaccount.com`, whose key is held by EAS | Google's only delivery channel for Android push: Expo hands each Android push to FCM | Google Analytics and Gemini (both off at creation), every other Firebase product, the Firebase SDKs (the apps only carry the public `google-services.json`) |
| **Google Play Console** | Personal developer account «Daleney Labs» (ID `5688059300530668770`) owned by the user's Google account, identity verified 2026-10-15; draft apps `com.emmapilates.client` («Emma Pilates») and `com.emmapilates.staff` («Emma Pilates Staff»), Spanish (Latin America), free, Play App Signing accepted, automatic protection on | Distributes the **Android apps**: Internal testing first, then the Client app's closed test and production release (REL-002 to REL-007); Staff stays on a closed track | Paid apps and in-app purchases (earning money is off, which keeps the legal address private), organization verification, the developer website |
| **SendPulse** | Account signed in with the owner's Google account; free SMTP plan; profile under SendPulse's manual review since 2026-10-15 | Will send the **authentication emails** from `no-responder@emmapilatesstudio.com` (EXT-001) | Email marketing, chatbots, every other product |
| **Better Stack** | Uptime monitor «Production API readiness»; error tracking apps `emma-pilates-api`, `emma-pilates-admin`, and `emma-pilates-mobile` with the Incidents email integration; heartbeats «Worker heartbeat» and «Database backup» | **Alerts** you by email when production is down or the API reports an unexpected error | Log management, status pages, on-call |

Not created yet, in the order the gates open (backlog, «Order to open the
gates»): **Apple Developer** (gate 9). The domain (gate 7) arrived on
2026-10-15; SendPulse's account exists but sends nothing until EXT-001.

## Environments

| | Production | Shared development | Local |
| --- | --- | --- | --- |
| API | Northflank `api` | Render `emma-pilates-dev-api` | `pnpm dev:backend` on port 3100 |
| Worker | Northflank `worker` (no email until gate 7) | none (Render Free cannot run one; EXT-010) | `node dist/src/worker-main.js` |
| Database | Aiven `emma-pilates-prod-db`, database `emma`, PostgreSQL 18 | Neon `emma-pilates-dev`, database `pilates_dev`, PostgreSQL 18 | Homebrew `postgresql@18` (18.6) on 5433: `emma_pilates`, `pilates_dev_sim`, `pilates_test_fixtures` |
| Admin web | https://emma-pilates-admin.vercel.app | Vercel preview per pull request | `pnpm dev:admin` on 5173 |
| Data | Real; one Administrator (Fernando Daleney) since 2026-10-14, no Clients; dumped daily to R2, restore drill passed 2026-10-14 | Public development fixtures only (the fixture password is in the repository) | Fixtures |
| `NODE_ENV` | `production` | `development` | `development` |
| Email | none: the worker leaves authentication emails queued until EXT-001 | none (no worker) | `LocalEmailCapture` under `apps/backend/.data/email-capture` |
| Images | Cloudflare R2 `emma-pilates-prod-images` (`OBJECT_STORAGE=s3`) | local disk, lost on redeploy, never processed (no worker) | `apps/backend/.data/uploads` |
| Release | automatic after CI on `main` (`release production` workflow), [runbook](../runbooks/production-release.md) | Render auto-deploys every push to `main` | — |

Every environment runs PostgreSQL 18: production (Aiven 18.6), shared
development (Neon 18.6), CI (`postgres:18-alpine`), the integration suite's
Docker fallback (`postgres:18-alpine`), and local (Homebrew 18.6 on port 5433,
beside an older PostgreSQL on 5432 that other projects on the Mac use; BE-019).
The schema tests expect PostgreSQL 18's SQLSTATE 23001 for a `RESTRICT`
violation and no longer accept older servers' 23503.

## Accounts

Every account belongs to the project owner and is shared with no one else.

| Provider | Account / team | Plan | Card on file | Used for |
| --- | --- | --- | --- | --- |
| GitHub | `DaleneyRuben`, repository `emma-pilates` (private) | Free | — | Code, CI, deploy automation; `main` protected by convention only |
| Northflank | team `emma-pilates`, project `default` | Developer Sandbox | Yes, for verification only | Production API, worker, migration job, and backup job |
| Cloudflare | `daleney.fernando@…`, account ID `1121636a866de46f92544db1a7ebe310` | Free; R2 subscription (free allowance) since 2026-10-14; domain `emmapilatesstudio.com` registered 2026-10-15 for $10.46, expires 2027-10-15, auto-renew on (the `.com` price becomes $11.17 on 2026-11-01) | Yes | R2 image storage and database dumps; the domain, its DNS, and Email Routing |
| Aiven | organization «My Organization», project `emma-pilates-prod` | Free (a $50 trial runs beside it, unused) | No | Production database |
| Vercel | `fernando-daleney-s-projects`, project `emma-pilates-admin` | Hobby, also for production by decision | — | Admin web previews and production, `/api/v1` proxy |
| Render | service `emma-pilates-dev-api` (`srv-db4ivt6i0phs73cru2p0`) | Free | — | Shared development API |
| Neon | project `emma-pilates-dev` (`winter-paper-96646104`) | Free | No | Shared development database |
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
  is in the [runbook](../runbooks/production-release.md#the-deploy-token).
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
  `emma-pilates-admin.vercel.app` to the Northflank API, every other host to
  Render, and every non-API path to `index.html`.
- `middleware.ts` adds `x-pilates-proxy-proof` from `ADMIN_WEB_PROXY_SECRET`
  to every forwarded `/api/v1` request (ADR-0087).
- Production deploys every push to `main`; a branch preview can be promoted
  to production for a test (it is rebuilt with the Production environment).
- A production deployment opened through any address other than
  `emma-pilates-admin.vercel.app` (its per-deployment URL, the `git-main`
  alias) proxies to the **development** API, whose origin check refuses it.
  When the domain arrives (gate 7), its host must join the production rule.

## Development in detail

- **Render `emma-pilates-dev-api`:** Free (0.1 CPU, 512 MB, sleeps after
  idling, about a minute to wake), Ohio, native Node runtime (no Docker),
  branch `main` with auto-deploy, root `apps/backend`, start
  `node dist/src/main.js`, health check `/health/ready`, build
  `npx --yes pnpm@11.19.0 install --frozen-lockfile --filter @pilates/backend... && npx --yes pnpm@11.19.0 run prisma:generate && npx --yes pnpm@11.19.0 run build`.
  Reports `release` `local` (no `RELEASE_ID`). `TRUSTED_PROXY_HOPS=3`
  (measured 2026-10-12). Not monitored: any uptime check would keep Neon awake
  past its 100 compute hours.
- **Neon `emma-pilates-dev`** (`winter-paper-96646104`, created 2026-10-13 by
  BE-019; it replaced the PostgreSQL 17 project `mute-base-19499907`, which was
  deleted the same day because Neon cannot upgrade a project's major
  version): Free, AWS US East 2, PostgreSQL 18, one branch
  (Neon calls it `production`; the whole project is development), database
  `pilates_dev`, role `pilates_dev_owner`, 0.25–2 CU scaling to zero, direct
  (unpooled) connection because Prisma migrations and pg-boss need session
  locks. Migrations and fixtures are applied from the user's Mac
  ([testing guide](../testing-guide.md), Test 36).
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
- **Vercel previews:** one per pull request, behind Vercel Authentication;
  only the branch alias (`emma-pilates-admin-git-<branch>-fernando-daleney-s-projects.vercel.app`)
  is trusted, registered on Render by the `preview-origins` workflow and
  removed when the pull request closes.

## Settings and secrets: where each one lives

Values never go in the repository or a chat. «Mac» means the user's own
`apps/backend/.env`, which Git ignores.

| Setting | Production | Development | Local / Mac | Notes |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Northflank `production` | Render | `.env` (local), commented `# DEV_DATABASE_URL=` (Neon) | Reset in Aiven or Neon to rotate |
| `DATABASE_POOL_MAX` | Northflank `production` (4) | default 10 | default 10 | Most connections per process (API or worker), split between its one Prisma and one pg-boss pool; Aiven allows 20 (BE-018) |
| `AUTHENTICATION_EMAIL_DIGEST_KEY` | Northflank `production` | Render | `.env` | Fresh per environment; rotation plan still to write |
| `AUTHENTICATION_LINK_ENCRYPTION_KEY` | Northflank `production` | Render | `.env` | 32 random bytes, base64 |
| `AUTHENTICATION_LINK_ENCRYPTION_KEY_ID` | Northflank `production` (`northflank-prod-v1`) | Render (`render-dev-v1`) | `local-development-v1` | |
| `AUTHENTICATION_LINK_BASE_URL` | Northflank `api` **and** `worker` services (the API's address) | default | default | The link domain arrives with gate 7 |
| `ADMIN_WEB_TRUSTED_ORIGINS` | Northflank `production` (`https://emma-pilates-admin.vercel.app`) | Render, rewritten by the `preview-origins` workflow | `http://localhost:5173` | |
| `ADMIN_WEB_PROXY_SECRET` | Northflank `production` **and** Vercel Production | Render **and** Vercel Preview | unset | Same value on both sides of each pair, different per environment |
| `TRUSTED_PROXY_HOPS` | Northflank `api` service (1) | Render (3) | 0 | Measured, never assumed (ADR-0087) |
| `ERROR_REPORTING_DSN` | Northflank `production` (the API and the worker) | Render | commented in `.env` | Write-only; `emma-pilates-api`, one Better Stack application for every environment and both processes |
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
| `NODE_ENV` | `production` (image default) | Render (`development`) | `.env` | |
| `RELEASE_ID` | from `NF_GIT_SHA` at build | unset (`local`) | unset | |
| `ENABLE_EXPERIMENTAL_COREPACK` | Vercel Production | Vercel Preview | — | Lets Vercel use the pinned pnpm |
| `NORTHFLANK_API_TOKEN` | GitHub repository secret | — | — | `release production` workflow; expires around 2027-10-14 |
| `RENDER_API_KEY` | — | GitHub repository secret | — | `preview-origins` workflow |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` | — | GitHub repository secrets | — | `preview-origins` and `cleanup-preview` workflows |

## Automation

- **`.github/workflows/ci.yml`:** every pull request and push to `main`;
  quality, unit, contract, e2e, and integration jobs per surface, the
  database jobs on `postgres:18-alpine`. Deploys nothing.
- **`.github/workflows/preview-origins.yml`:** on each successful preview
  deployment and each closed pull request, recomputes the trusted preview
  origins and writes them to Render's `ADMIN_WEB_TRUSTED_ORIGINS` (WEB-019).
- **`.github/workflows/cleanup-preview.yml`:** deletes a closed pull
  request's Vercel previews (EXT-007).
- **`.github/workflows/release-production.yml`:** after `ci` passes on a
  push to `main` (or by hand with a commit), builds and runs Northflank's
  `migrate` job, then builds `api`, waits for `/health/ready` to report the
  commit, builds the same commit on `worker` and waits for its rollout
  (EXT-002), builds it on the `backup` job without running it (EXT-009), and
  runs the smoke check (EXT-008).
- **Deployments:** Vercel deploys previews and `main`; Render deploys `main`;
  Northflank deploys `main` through the `release production` workflow, never
  on a push by itself.

## Monitoring

- **Better Stack «Production API readiness»:** `/health/ready` on Northflank
  every 3 minutes, 3-minute confirmation, four regions, email alerts; verified
  to fire and recover on 2026-10-13.
- **Better Stack error tracking `emma-pilates-api`:** both APIs and the
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
