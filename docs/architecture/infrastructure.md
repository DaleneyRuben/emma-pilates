# Infrastructure

What runs where, who owns each account, and where every setting lives.
Last verified **2026-10-13** (gate 4). This page holds **no secret values**:
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
 (none yet) (Northflank api, US Central)            (Render Free, Ohio, sleeps when idle)
              │ TLS, Aiven CA verified                          │ TLS
              ▼                                                 ▼
            Aiven Free PostgreSQL 18                          Neon Free PostgreSQL 17
            emma-pilates-prod-db / emma                       emma-pilates-dev / pilates_dev
            (DigitalOcean US West)                            (AWS US East 2, Ohio)

 Better Stack: production readiness every 3 min, API error reports from both APIs, worker heartbeat (paused)
 GitHub Actions: CI on every pull request and main, preview cleanup, preview-origin registration
```

## Environments

| | Production | Shared development | Local |
| --- | --- | --- | --- |
| API | Northflank `api` | Render `emma-pilates-dev-api` | `pnpm dev:backend` on port 3100 |
| Worker | **none yet** (gates 5 and 7) | none (Render Free cannot run one) | `node dist/src/worker-main.js` |
| Database | Aiven `emma-pilates-prod-db`, database `emma`, PostgreSQL 18 | Neon `emma-pilates-dev`, database `pilates_dev`, PostgreSQL 17 | Homebrew PostgreSQL 14.18 on 5432: `emma_pilates`, `pilates_dev_sim`, `pilates_test_fixtures` |
| Admin web | https://emma-pilates-admin.vercel.app | Vercel preview per pull request | `pnpm dev:admin` on 5173 |
| Data | Real, empty so far; nobody can sign in yet | Public development fixtures only (the fixture password is in the repository) | Fixtures |
| `NODE_ENV` | `production` | `development` | `development` |
| Email | none (no worker) | none (no worker) | `LocalEmailCapture` under `apps/backend/.data/email-capture` |
| Images | upload refused (`501`) | local disk, lost on redeploy | `apps/backend/.data/uploads` |
| Release | by hand, [runbook](../runbooks/production-release.md) | Render auto-deploys every push to `main` | — |

CI runs PostgreSQL 18 (`postgres:18-alpine`); moving local and Neon to 18 is
BE-019.

## Accounts

Every account belongs to the project owner and is shared with no one else.

| Provider | Account / team | Plan | Card on file | Used for |
| --- | --- | --- | --- | --- |
| GitHub | `DaleneyRuben`, repository `emma-pilates` (private) | Free | — | Code, CI, deploy automation; `main` protected by convention only |
| Northflank | team `emma-pilates`, project `default` | Developer Sandbox | Yes, for verification only | Production API and migration job |
| Aiven | organization «My Organization», project `emma-pilates-prod` | Free (a $50 trial runs beside it, unused) | No | Production database |
| Vercel | `fernando-daleney-s-projects`, project `emma-pilates-admin` | Hobby, also for production by decision | — | Admin web previews and production, `/api/v1` proxy |
| Render | service `emma-pilates-dev-api` (`srv-db4ivt6i0phs73cru2p0`) | Free | — | Shared development API |
| Neon | project `emma-pilates-dev` (`mute-base-19499907`) | Free | No | Shared development database |
| Better Stack | team `t614177` | Free | No | Uptime, error tracking, heartbeat, email alerts |
| Expo, Apple, Google Play, Cloudflare R2, SendPulse, domain | not created yet | — | — | Gates 5–9 |

## Production in detail

### Northflank

- **Region:** US Central (Council Bluffs). Free projects can use only US
  Central or Europe West, and a project's region cannot change.
- **Service `api`:** combined service (builds and runs), repository
  `DaleneyRuben/emma-pilates`, branch `main`, Dockerfile
  `/apps/backend/Dockerfile`, build context `/`; **CI off** (pushes never
  build), **CD on** (a finished build deploys). Plan nf-compute-20
  (0.2 vCPU, 512 MB, the largest free plan), 1 instance, uses about 290 MB.
  Port 3100 public HTTP as `p01` → https://p01--api--mmps25fn9k9x.code.run.
  Readiness probe `/health/ready` (delay 10 s, period 10 s, timeout 5 s, 3
  failures); liveness probe `/health/live` (delay 60 s, period 10 s, timeout
  3 s, 3 failures). Service variables: `AUTHENTICATION_LINK_BASE_URL`
  (its own HTTPS address until the domain exists) and `TRUSTED_PROXY_HOPS=1`.
- **Job `migrate`:** manual job, same repository, branch, and Dockerfile
  (Northflank cannot point a job at a combined service's image), nf-compute-20,
  command `node_modules/.bin/prisma migrate deploy`, retry limit 0, CI off.
- **Secret group `production`:** runtime scope, unrestricted (every service
  and job in the project receives it). Holds everything in the «Settings»
  table below marked Northflank, plus two files:
  `/etc/secrets/emma-ca.pem` (Aiven's CA certificate, public) and
  `/etc/secrets/transfer-qr.png` (the studio's transfer QR, binary).
- **Release identifier:** Northflank passes the built commit as the build
  argument `NF_GIT_SHA`; the Dockerfile turns it into `RELEASE_ID`, which
  `/health/ready` and every log line report.
- **Free allowance:** 2 services, 2 jobs, 1 addon, up to $20 a month of
  resources. In use: 1 service, 1 job, ~$5.40 of resources. The second
  service slot is kept for the worker, the second job slot for the daily
  backup (EXT-009).

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
- **Neon `emma-pilates-dev`:** Free, AWS US East 2, PostgreSQL 17, one branch
  (Neon calls it `production`; the whole project is development), database
  `pilates_dev`, role `pilates_dev_owner`, 0.25–2 CU scaling to zero, direct
  (unpooled) connection because Prisma migrations and pg-boss need session
  locks. Migrations and fixtures are applied from the user's Mac
  ([testing guide](../testing-guide.md), Test 36).
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
| `DATABASE_POOL_MAX` | Northflank `production` (2) | default 10 | default 10 | Aiven allows 20 connections; BE-018 |
| `AUTHENTICATION_EMAIL_DIGEST_KEY` | Northflank `production` | Render | `.env` | Fresh per environment; rotation plan still to write |
| `AUTHENTICATION_LINK_ENCRYPTION_KEY` | Northflank `production` | Render | `.env` | 32 random bytes, base64 |
| `AUTHENTICATION_LINK_ENCRYPTION_KEY_ID` | Northflank `production` (`northflank-prod-v1`) | Render (`render-dev-v1`) | `local-development-v1` | |
| `AUTHENTICATION_LINK_BASE_URL` | Northflank `api` service (its own address) | default | default | The link domain arrives with gate 7 |
| `ADMIN_WEB_TRUSTED_ORIGINS` | Northflank `production` (`https://emma-pilates-admin.vercel.app`) | Render, rewritten by the `preview-origins` workflow | `http://localhost:5173` | |
| `ADMIN_WEB_PROXY_SECRET` | Northflank `production` **and** Vercel Production | Render **and** Vercel Preview | unset | Same value on both sides of each pair, different per environment |
| `TRUSTED_PROXY_HOPS` | Northflank `api` service (1) | Render (3) | 0 | Measured, never assumed (ADR-0087) |
| `ERROR_REPORTING_DSN` | Northflank `production` | Render | commented in `.env` | Write-only; one Better Stack application for every environment |
| `WORKER_HEARTBEAT_URL` | not set (no worker) | not set | commented in `.env` | Better Stack heartbeat, paused |
| `TRANSFER_*` | Northflank `production`: `PENDIENTE` texts, QR file path | defaults | defaults | PAY-003 makes the QR the only instruction |
| `NODE_ENV` | `production` (image default) | Render (`development`) | `.env` | |
| `RELEASE_ID` | from `NF_GIT_SHA` at build | unset (`local`) | unset | |
| `ENABLE_EXPERIMENTAL_COREPACK` | Vercel Production | Vercel Preview | — | Lets Vercel use the pinned pnpm |
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
- **Deployments:** Vercel deploys previews and `main`; Render deploys `main`;
  Northflank deploys only when a build is started by hand (EXT-008 automates
  it).

## Monitoring

- **Better Stack «Production API readiness»:** `/health/ready` on Northflank
  every 3 minutes, 3-minute confirmation, four regions, email alerts; verified
  to fire and recover on 2026-10-13.
- **Better Stack error tracking `emma-pilates-api`:** both APIs report
  unexpected failures (no messages, no request data) when
  `ERROR_REPORTING_DSN` is set; the Incidents integration emails on new and
  re-opened errors.
- **Better Stack «Worker heartbeat»:** paused until a production worker runs.
- **Northflank:** logs (JSON lines), metrics, container restarts.
- Not yet: admin-web and mobile error reporting with source maps (ADR-0081),
  queue-age and reconciler alerts (ADR-0066), backup heartbeat (EXT-009).

## Known gaps

- No production worker: no email, no scheduled jobs, nobody can sign in
  (gates 5 and 7, BE-018 first).
- No portable backup or restore drill (EXT-009): no real Client data before
  the first drill passes.
- Releases are manual (EXT-008).
- The API can open 16 database connections, above ADR-0027's four (BE-018).
- Local and Neon are not on PostgreSQL 18 yet (BE-019).
- No domain: production uses the providers' hostnames.

## Keeping this current

Update this page in the same pull request as any change to an account, plan,
region, service, secret's location, workflow, or monitor, and change the
«Last verified» date when it is re-checked.
