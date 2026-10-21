# Runbook: secrets rotation

Every secret, token, key, and password the system holds, where it lives, who
issues it, how to replace it without downtime, and when (EXT-020). It completes
what [ADR-0079](../adr/0079-keep-runtime-secrets-in-environment-providers.md)
promised: rotation and access procedures documented before real Clients use
production. The [incident runbook](./incident-response.md#4-rotate-secrets)
says *which* secrets to rotate after a leak; this one says *how*. The
[infrastructure page](../architecture/infrastructure.md#settings-and-secrets-where-each-one-lives)
is the inventory of every setting, secret or not.

**This page holds no secret values.** Never paste one into a chat, a commit, a
log, a ticket, or this runbook. Rotation dates and the name of the person who
rotated go in the log at the end.

## Rules that apply to every rotation

1. **Create the new value before touching the old one.** A provider that can
   hold two keys at once (Resend, Expo, Cloudflare R2, Northflank API tokens,
   Vercel tokens, Google Cloud service-account keys) gets the new one first,
   so nothing stops working in between.
2. **Update every holder, then restart what reads it.** Northflank services
   read the `production` and `staging` groups at boot only: after changing a
   value, **Restart** `api` and `worker` (the group's own Restart button works
   only for restricted groups); a job (`migrate`, `backup`) picks up the new
   value on its next run. Vercel reads Production variables at deploy time:
   redeploy the admin web through the release workflow. GitHub Actions reads
   a repository secret at the next run; nothing to restart.
3. **Release before deleting a variable** (EXT-003, PAY-003 lesson): a
   variable a running release still validates at boot must not be removed
   until the release that stops reading it is live, or the next restart
   crash-loops on a `ZodError`. Renaming a secret counts as deleting it.
4. **Verify, then revoke the old value.** Each table below names the check.
   Only after it passes delete or revoke the old key in its provider. Keep
   the old value nowhere.
5. **Rotate the environment that needs it.** Production and staging hold
   separate values for every secret (ADR-0092); a staging leak does not need a
   production rotation, and the other way round. Local `.env` files hold
   development-only values and are never rotated here.
6. **Staging costs money while it runs** and is usually paused: resume `api`
   and `worker` before a staging rotation, check, then pause them again
   ([release runbook](./production-release.md#pause-and-resume-staging)).
7. Everything behind the owner's own logins (every console) is the owner's to
   do; an assistant writes the steps and checks the public result. The
   owner's logins are in Brave.

## Inventory

«Where» is the one place the value is kept at runtime; «Issued by» is the
console that creates it. «Expires» is the provider's own lifetime; «—» means
the provider never expires it and only the calendar below does.

### Deploy tokens (GitHub Actions repository secrets)

| Secret | Where | Issued by | Used by | Expires |
| --- | --- | --- | --- | --- |
| `NORTHFLANK_API_TOKEN` | GitHub secret | Northflank team `emma-pilates` → API tokens (`github-actions-release`, role `github-production-release`) | `Release Production` | **2027-10-14** (1-year lifetime from 2026-10-14) |
| `NORTHFLANK_STAGING_API_TOKEN` | GitHub secret | Northflank team `emma-pilates-staging` → API tokens (`github-actions-staging-release`, role `github-staging-release`) | `Release Staging` | **2027-10-17** (1 year from 2026-10-17) |
| `VERCEL_PRODUCTION_TOKEN` | GitHub secret | Vercel → Account Settings → Tokens (`github-actions-production-release`, scoped to `emma-pilates-admin`) | `Release Production` (admin web) | — (checked 2026-10-21: «Never expires»), so it joins the yearly September sitting |
| `VERCEL_STAGING_TOKEN` | GitHub secret | Vercel → Tokens (`github-actions-staging-release`, scoped to `emma-pilates-admin-staging`) | `Release Staging` (admin web) | — («Never expires», checked 2026-10-21) |
| `VERCEL_ORG_ID`, `VERCEL_PRODUCTION_PROJECT_ID`, `VERCEL_STAGING_PROJECT_ID` | GitHub secrets | Vercel project settings | both release workflows | — (identifiers, not credentials; they never rotate) |
| `PRODUCTION_BACKUP_READ_ACCESS_KEY_ID`, `PRODUCTION_BACKUP_READ_SECRET_ACCESS_KEY` | GitHub secrets | Cloudflare R2 → Manage API tokens (`github-staging-copy`, Object Read on `emma-pilates-prod-backups`) | `Copy Production to Staging` | — |
| `STAGING_DATABASE_PASSWORD` | GitHub secret **and** inside staging's `DATABASE_URL` (Northflank `staging` group) | Aiven, the `emma_staging` role's password | `Copy Production to Staging`; staging `api`, `worker`, `migrate` | — |
| `AIVEN_CA_CERT` | GitHub repository **variable** (public certificate) | Aiven → Overview → Connection information → CA certificate | `Copy Production to Staging` | Aiven's project CA; check its «Not after» date once a year with `openssl x509 -noout -enddate` |

**How to rotate a Northflank token** (no downtime: releases are started by
hand or after a merge, so rotate between releases): Northflank → the team →
**API tokens** → **Create token** with the same role and a 1-year lifetime;
copy it with its copy icon; from the repository root run
`gh secret set NORTHFLANK_API_TOKEN --repo DaleneyRuben/emma-pilates` (or
`NORTHFLANK_STAGING_API_TOKEN`) and paste at the hidden prompt; **verify** by
running the matching release workflow by hand (`gh workflow run
release-staging.yml`, or the next promotion for production) and reading its
log for `migrate` and `api build`; then delete the old token in Northflank and
update the expiry date in the calendar below and in
[infrastructure](../architecture/infrastructure.md). A token can only use a
role its creator belongs to, so the owner stays a member of
`github-production-release` and `github-staging-release`.

**How to rotate a Vercel token:** Vercel → Account Settings → **Tokens** →
**Create** with the same name, scoped to the one project, with a 1-year expiry;
`gh secret set VERCEL_PRODUCTION_TOKEN` (or `VERCEL_STAGING_TOKEN`) at the
hidden prompt; verify with the next release of that environment (its
`admin-web` job runs `vercel pull`, `build`, and `deploy`); delete the old
token.

**How to rotate the copy-workflow pair:** R2 → Manage API tokens → create a
new Object Read token on `emma-pilates-prod-backups` only; `gh secret set` both
names; verify only when a copy is next needed (the workflow's first step reads
the bucket; a 403 there means the pair is wrong); delete the old token. For
`STAGING_DATABASE_PASSWORD`, see «Database passwords».

### Northflank `production` group (team `emma-pilates`)

Read by `api`, `worker`, `migrate`, and `backup`. After any change here:
**Restart** `api` and `worker`.

| Secret | Issued by | Used by | How to rotate without downtime | Verify |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` (the `avnadmin` password) | Aiven | all four pieces | «Database passwords» below | `/health/ready` answers 200 after the restart; the next `backup` run logs `database_backup_succeeded` |
| `AUTHENTICATION_LINK_ENCRYPTION_KEY` + `AUTHENTICATION_LINK_ENCRYPTION_KEY_ID` | generated: `openssl rand -base64 32`; the ID is a new label (`northflank-prod-v2`) | `api` and `worker` (same values on both) | Links queued but not yet sent are encrypted with the old key and cannot be sent after the switch. Rotate at a quiet hour: set both values, restart `api` **then** `worker`, then run the incident runbook's «unused links» statement so people ask for a fresh link | Request a recovery email for your own address: it arrives and opens |
| `AUTHENTICATION_EMAIL_DIGEST_KEY` | generated, 32 random bytes base64 | `api`, `worker` | Set, restart both. The recipient throttle history no longer matches and restarts empty (harmless) | A verification resend is accepted |
| `ADMIN_WEB_PROXY_SECRET` | generated, `openssl rand -hex 32` | `api`; the same value is Vercel Production's variable | The two sides must match, so there is a short gap either way. Order that keeps it shortest: set the new value in Vercel Production, redeploy the admin web (`Release Production` with the current commit, or Vercel → Deployments → Redeploy), then set it in Northflank and restart `api`. Until both match the API logs forwarded addresses as untrusted (ADR-0087) but keeps serving | An admin-web login works and the API log shows hop count 2 |
| `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY` | Cloudflare R2 → Manage API tokens (`northflank-production-images`, Object Read & Write on the images bucket only) | `api`, `worker` | Create the new token, set both values, restart both, then delete the old token | Upload a profile photo: it reaches READY |
| `RESEND_API_KEY` | Resend → API keys (`northflank-production`, sending only, domain-limited) | `worker` | Create the new key, set it, restart `worker`, delete the old key | A verification resend arrives |
| `RESEND_WEBHOOK_SECRET` | Resend → Webhooks → the production endpoint → **Rotate secret** | `api` | Rotate in Resend (the old signature answers 401 until the restart; Resend retries), set the new `whsec_`, restart `api` | Resend → the webhook → send a test event → 2xx |
| `EXPO_ACCESS_TOKEN` | Expo → organization `emma-pilates` → robot `push-sender` → Access tokens (`northflank-production`) | `worker` | Create the new token on the robot, set it, restart `worker`, revoke the old one | A push arrives on an Android staging or Play build (testing guide, Test 46) |
| `ERROR_REPORTING_DSN` | Better Stack → Errors → `emma-pilates-api` → settings (the DSN is write-only and public-safe; rotate only after a leak) | `api`, `worker` | Set, restart both | A caught error appears in Better Stack |
| `/etc/secrets/emma-ca.pem` | Aiven (public CA) | all four pieces | Replace the file when Aiven re-issues its CA, restart all | `/health/ready` 200 |
| `/etc/secrets/transfer-qr.png`, `TRANSFER_QR_IMAGE_PATH` | the studio | `api` | Not a secret; replace when the studio's bank changes | The Client payment screen shows the new QR |

Service-level variables that are not secrets (`AUTHENTICATION_LINK_BASE_URL`,
`TRUSTED_PROXY_HOPS`, `WORKER_HEARTBEAT_URL`, `DATABASE_POOL_MAX`,
`ADMIN_WEB_TRUSTED_ORIGINS`) change through the release runbook's
«Change a setting».

### Northflank `backup` job (production)

Picks up changes on its next scheduled run; no restart. To test sooner, run
the job by hand (Jobs → `backup` → **Run**).

| Secret | Issued by | How to rotate | Verify |
| --- | --- | --- | --- |
| `BACKUP_STORAGE_ACCESS_KEY_ID`, `BACKUP_STORAGE_SECRET_ACCESS_KEY` | R2 → Manage API tokens (`northflank-production-backups`, Object Read & Write on `emma-pilates-prod-backups` only) | Create the new token, set both job variables, run the job by hand, then delete the old token. The bucket lock keeps every `daily/` object for 25 days whatever the token does | The run logs `database_backup_succeeded`; `pnpm backup:check` from the Mac passes |
| `BACKUP_HEARTBEAT_URL` | Better Stack → Heartbeats → «Database backup» (recreate the heartbeat to get a new URL) | Set the new URL, run the job by hand before the old heartbeat's 2-hour grace alerts, delete the old heartbeat | The heartbeat shows Up |
| `mac-backup-restore` (owner's R2 token, typed at hidden prompts; stored only in the owner's password manager) | R2 → Manage API tokens (Object Read only on the backup bucket) | Create a new one, run the weekly `backup:check`, delete the old one | `backup:check` prints `"passed": true` |

### Northflank `staging` group (team `emma-pilates-staging`)

The same names as production with staging's own values: `DATABASE_URL` (the
`emma_staging` role), the link keys (`northflank-staging-v1`), the digest key,
`ADMIN_WEB_PROXY_SECRET` (matched by Vercel project
`emma-pilates-admin-staging`), `OBJECT_STORAGE_*` (R2 token
`northflank-staging-images`), `RESEND_API_KEY` (`northflank-staging`),
`RESEND_WEBHOOK_SECRET` (staging's webhook), `ERROR_REPORTING_DSN` (the same
application, tagged `staging`). Rotate each exactly as the production row
says, in the staging consoles, with staging resumed; verify with a staging
release (`gh workflow run release-staging.yml`) and the matching check on the
staging hosts; then pause staging. Staging has no `EXPO_ACCESS_TOKEN` and no
backup job.

### Mobile and store credentials (held by Expo EAS or Google)

| Secret | Where | Issued by | How to rotate | Verify |
| --- | --- | --- | --- | --- |
| FCM V1 service account key (`firebase-adminsdk-fbsvc@emma-pilates.iam.gserviceaccount.com`) | each EAS project's Android credentials | Firebase → Project settings → Service accounts → Generate new private key (a Google Cloud key file) | Upload the new JSON to both EAS projects (`eas credentials` → Android → Push notifications), then delete the old key in Google Cloud → IAM & Admin → Service accounts → Keys. No build needed | A push arrives on Android |
| Play submit key (`play-submit@emma-pilates.iam.gserviceaccount.com`) | the Expo account (selected on both store identifiers) | Google Cloud → IAM & Admin → Service accounts → `play-submit` → Keys | Create a JSON key, choose it in each app's Expo credentials, delete the old key in Google Cloud | `eas submit --profile production --platform android` uploads to Internal testing |
| `SENTRY_AUTH_TOKEN` (Better Stack Telemetry API token, account-wide) | EAS environment variables `preview` and `production`, both projects, as a secret | Better Stack → Settings → API tokens | Create the new token, `eas env:update` in each environment of each project, revoke the old one. A build without it still succeeds (`SENTRY_ALLOW_FAILURE`) | The next release build's log shows the source-map upload |
| Android upload keystores (one per app and per variant) | EAS only | EAS generated them | **Never rotated**: Play App Signing holds the app signing key and can reset a lost upload key (Play Console → App integrity → Request upload key reset). Keep a downloaded copy (`eas credentials` → Download) in the owner's password manager before the first store build (known gap) | — |
| `EXPO_PUBLIC_*` DSNs, `VITE_ERROR_REPORTING_DSN`, `google-services.json` | bundles | Better Stack, Firebase | Public by design (write-only or client keys); replace only if Better Stack or Firebase re-issue them, which needs a new build or update | — |

### Database passwords (Aiven)

Aiven can reset a role's password in place, which drops every open connection
of that role at once. Production has one Administrator and no Clients yet, so
a reset at a quiet hour costs a few seconds of `503`; once real Clients use
production, prefer the two-role path.

- **`avnadmin` (production, in-place):** Aiven → the service → Users →
  `avnadmin` → **Reset password** (or set one you generated). Build the new
  `DATABASE_URL` without showing it ([release runbook](./production-release.md#database-connection)),
  set it in the `production` group, restart `api` and `worker` at once. The
  `migrate` and `backup` jobs read the group on their next run. Verify
  `/health/ready` 200 and the next dump.
- **`avnadmin` (no gap, once Clients exist):** create a second superuser-like
  role in Aiven, grant it `emma`'s ownership path the same way `emma_staging`
  was set up, switch `DATABASE_URL` to it, restart, then reset `avnadmin` and
  switch back next time. Record which role production runs on in the log.
- **`emma_staging`:** Aiven → Users → `emma_staging` → reset. Two holders:
  staging's `DATABASE_URL` (Northflank `staging` group; restart its `api` and
  `worker`) and the GitHub secret `STAGING_DATABASE_PASSWORD` (`gh secret set`
  at the hidden prompt). Verify with a staging release and, if a copy is
  planned, the copy workflow's «Check the target» step.

### Owner's logins (not rotated on a calendar)

Every provider account (GitHub, Northflank, Aiven, Cloudflare, Vercel,
Better Stack, Expo, Firebase and Google Cloud, Google Play, Resend) is the
owner's single login with two-factor authentication where the provider offers
it, kept in Brave and a password manager. The Mac's `gh` login is a GitHub
OAuth session (`gh auth status`) and the Mac's `eas` login must be
`daleneyfernando`. Change these only after a suspected compromise (the
incident runbook) or when the provider asks.

## Calendar

Rotation is planned **a month before** a provider expiry, and once a year
for secrets that never expire (every September, when the deploy tokens are
renewed, so one sitting covers everything). A deploy token that lapses only
stops the next release; nothing in production stops.

| When | What | Why |
| --- | --- | --- |
| **2027-09-14** | Rotate `NORTHFLANK_API_TOKEN` (new token, 1-year lifetime) | Expires 2027-10-14 |
| **2027-09-17** | Rotate `NORTHFLANK_STAGING_API_TOKEN` | Expires 2027-10-17 |
| **2027-09-14** (same sitting) | Rotate `VERCEL_PRODUCTION_TOKEN` and `VERCEL_STAGING_TOKEN` (they never expire on their own), the R2 tokens (`northflank-production-images`, `northflank-production-backups`, `github-staging-copy`, `northflank-staging-images`, `mac-backup-restore`), the Resend keys and webhook secrets, the Expo robot token, the FCM key, the Play submit key, and the Telemetry API token | Yearly rotation of never-expiring credentials |
| **2027-09-15** | Check the domain renewal (`emmapilatesstudio.com` expires 2027-10-15, auto-renew on, card on Cloudflare) and the Aiven CA's «Not after» date | Not secrets, but the same month |
| every 3 months (first run January 2027) | Restore drill ([backups runbook](./backups-and-restore-drills.md#restore-drill)) | BE-007 G9 |
| every month | Free-plan usage check ([infrastructure, «Free-plan limits that can be exceeded silently»](../architecture/infrastructure.md#free-plan-limits-that-can-be-exceeded-silently)) | Cost guard |
| after a leak | The incident runbook's table | — |

### The reminder

[`.github/workflows/operations-reminders.yml`](../../.github/workflows/operations-reminders.yml)
runs on the first day of every month (09:00 La Paz) and opens a GitHub issue
for each line of the calendar that falls due in the coming month: a rotation
whose date is within 31 days, the drill in January, April, July, and
October, and the usage check every month. It uses the workflow's own
`GITHUB_TOKEN` (`issues: write`), so it needs no secret of its own and costs
nothing (a few seconds of the free Actions minutes). It skips a reminder
whose issue is still open, so a missed month does not pile up. GitHub emails
the owner for every issue opened in their repository, which is the alert.
Two things to know:

- GitHub disables a scheduled workflow after **60 days without a push** to
  the repository; the workflow can be started by hand (Actions → Operations
  reminders → Run workflow) and GitHub's email about the disabling is the
  cue to re-enable it.
- The dates live in the workflow's table. After every rotation, move the
  line a year forward in the workflow **and** in the calendar above, in the
  same pull request as the log row.

## Rotation log

| Date | Secret | Environment | Done by | New expiry | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-10-14 | `NORTHFLANK_API_TOKEN` created | production | Owner | 2027-10-14 | First token (EXT-008) |
| 2026-10-17 | `NORTHFLANK_STAGING_API_TOKEN` created | staging | Owner | 2027-10-17 | First token (EXT-017) |
| 2026-10-21 | `VERCEL_PRODUCTION_TOKEN`, `VERCEL_STAGING_TOKEN` checked | both | Owner | never | Created without an expiry (EXT-017); next rotation at the 2027-09-14 sitting |
