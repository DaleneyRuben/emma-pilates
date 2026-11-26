# Hardcoded configuration and secrets audit, 2026-11-25

Report only: nothing in the code was changed. Fixes come later as separate,
owner-approved pull requests.

**Why now:** the Apple Team ID stayed `null` in
`apps/backend/src/links/app-links.ts` after the Apple Developer account was
approved, so iOS never claimed the email links. The owner asked what else is
hardcoded that should be configuration or a secret, and whether anything
sensitive was ever committed.

**Scope:** `main` at `a64f93195`: `apps/*`, `packages/*`, `.github/workflows`,
`scripts/`, `apps/backend/Dockerfile`, both `eas.json`, both `app.json` and
`app.config.js`, `apps/admin-web/vercel.json`, `docs/`, and the whole git
history (`git log -p --all`, 7,293 commits).

Every value below is cut to its first four characters. Nothing in this
report is a usable credential.

## Method

- **History:** gitleaks and trufflehog are not installed on this Mac, so a
  scanner ran over every added line of `git log -p --all`. It looked for
  private keys, AWS, Resend (`re_`), Resend webhook (`whsec_`), Stripe,
  GitHub, Slack, npm and Google API keys, JWTs, database or Redis URLs with a
  password, DSNs with a key, Better Stack heartbeat URLs, 32 and 64-character
  hex strings, `SECRET|TOKEN|PASSWORD|API_KEY = "…"` assignments, and any
  token of 24 or more characters with mixed case, digits and high entropy
  (Shannon > 4.2). Lockfiles and generated `design/` output were skipped. It
  also listed every file ever added whose name looks like a credential
  (`.env`, `.pem`, `.p8`, `.p12`, `.jks`, `.keystore`, service-account JSON,
  `GoogleService-Info.plist`, `.npmrc`).
- **Working tree:** searches for hosts, emails, phone numbers, account and
  project IDs, bucket names, `null` placeholders, `TODO`, «gate N» and
  «pending» markers, then a read of each config file in scope.
- **Context:** `.gitleaks.toml`, the CI `secrets` job, `docs/runbooks/secrets-rotation.md`
  (all Northflank-held secrets rotated on 2026-10-31) and
  `docs/architecture/infrastructure.md`.

## Result in one line

**No real secret is in the code or the history.** Every credential-shaped
value is a test placeholder, a local-only default that production refuses, or
a public client identifier. The open problems are stale «waiting for Apple»
values and a few production hosts hardcoded in CI and in `vercel.json`.

| Category | Count |
| --- | --- |
| CRITICAL | 0 |
| SHOULD BE CONFIG | 4 |
| STALE | 5 |
| FINE AS CODE | 11 |
| Observations (not hardcoded values) | 4 |

## Summary table

| # | Severity | File:line | Value (redacted) | Why | Recommended action |
| --- | --- | --- | --- | --- | --- |
| T1 | STALE | `apps/backend/src/links/app-links.ts:53` | `null` | `appleTeamId` is still `null` («Gate 9 pending»), so `/.well-known/apple-app-site-association` returns no `details` and iOS never opens email links in the apps. The Team ID `SN44…` has been in both `eas.json` since `38da9d057` (2026-11-23) | Being fixed on `fix/ios-universal-links`. Keep a test that fails when the AASA has no app IDs in production |
| T2 | STALE | `apps/backend/src/links/link-fallback-page.ts:96` | `http…` (Play only) | The page a browser gets for an email link offers only «Descargar en Google Play». An iPhone user gets an Android store button | Add an App Store button from each app's `ascAppId` (`6838…`) once the apps are public on the App Store (TestFlight link until then), chosen by user agent or shown side by side |
| T3 | STALE | `docs/architecture/infrastructure.md:50`, `:53`, `:80`, `:131`, `:628`, `:639`; `docs/diagnostico-emma-pilates.md:634`, `:683` | «not created yet», «gate 9» | The infrastructure doc still says the Apple account does not exist, no store builds until gates 8–9, iOS push and Universal Links wait for gate 9 | Update the provider table (Apple row: account, Team ID, App Store Connect apps), the diagram and the «Known gaps» list |
| T4 | STALE | `docs/architecture/infrastructure.md:639` | «APNs key (gate 9)» | iOS pushes fail with `InvalidCredentials` until an APNs key is on EAS. The account now exists, but nothing in the repo records that the key was uploaded | Check `eas credentials` → iOS → Push Notifications for both projects; upload the APNs key if missing; verify one push on a real iPhone |
| T5 | STALE | `docs/runbooks/secrets-rotation.md` (no row) | — | The rotation runbook has no rows for the Apple credentials now on EAS (APNs key, App Store Connect API key, distribution certificate) nor for the `EXPO_TOKEN` GitHub secret the mobile workflows read | Add one row each: where it lives, who issues it, how to rotate, how to verify |
| S1 | SHOULD BE CONFIG | `.github/workflows/release-production.yml:30` | `http…` (`p01-…code.run`) | The production API URL is hardcoded while staging's comes from `vars.STAGING_API_URL`. If the Northflank service is recreated or moves to a custom domain, the release smoke test hits the old host | Move it to a repository variable `PRODUCTION_API_URL`, like staging |
| S2 | SHOULD BE CONFIG | `apps/admin-web/vercel.json:43`, `:46`, `:53`, `:56` | `emma…` (`vercel.app` hosts), `http…` (two `code.run` hosts) | The admin web's `/api/v1` rewrite names both Northflank API hosts and both Vercel hosts. `vercel.json` cannot read environment variables, so changing the API host means a code change and a release | Either give the API a stable custom domain (`api.` and `api-staging.emmapilatesstudio.com`) so the file names hosts that never change, or proxy in `middleware.ts` (which already runs on `/api/v1`) from an `API_ORIGIN` Vercel variable |
| S3 | SHOULD BE CONFIG | `.github/workflows/copy-production-to-staging.yml:29`–`34` | `http…` (R2 endpoint with account ID `1121…`), `emma…` (bucket), `emma…` (Aiven host), `2068…` (port) | Production storage and database coordinates are inlined in the workflow. They are identifiers, not credentials (the keys and password come from secrets), but a new bucket, R2 account or Aiven service means editing the workflow | Move the endpoint, bucket, host and port to repository variables, next to `AIVEN_CA_CERT` which already is one |
| S4 | SHOULD BE CONFIG | `apps/backend/src/script-runner/scripts/android-test-studio/studio-people.ts:14`; `.../params.ts:52` | `emma…@gmail.com`, `emma…+<key>@gmail.com` | The test studio script hardcodes the owner's Gmail as the acting Administrator and derives every test Staff email from it. Another operator or a new studio inbox needs a code change | Take the administrator email (and the staff address pattern) as script params with today's values as documented defaults |
| F1 | FINE AS CODE | `apps/backend/src/links/app-links.ts:15`–`36` | `F6:8…`, `AC:C…`, `EE:E…`, `76:B…`, `36:9…`, `EF:1…` | Android package names and SHA-256 signing certificate fingerprints are published in `assetlinks.json` by design (ADR-0095) | None |
| F2 | FINE AS CODE | `apps/client-mobile/eas.json:53`–`54`; `apps/staff-mobile/eas.json:53`–`54` | `SN44…`, `6838…` | The Apple Team ID and App Store Connect app IDs are public identifiers (the Team ID ends up in the AASA) | None. T1 should read the same value, not a second copy that can drift |
| F3 | FINE AS CODE | `apps/client-mobile/app.json:14`, `:32`, `:124`, `:129`; staff `app.json` equivalents | `com.…`, `c927…`, `885d…` | Bundle IDs, Android packages, Expo project IDs and the EAS Update URL are compiled into the apps and are stable | None |
| F4 | FINE AS CODE | `apps/client-mobile/google-services.json:18`, `:37`, `:56`, `:75`; staff `:18`, `:37`, `:56`, `:75` | `AIza…` | Firebase Android client keys ship inside every APK; `.gitleaks.toml` already allowlists them | Hardening, optional: in Google Cloud → Credentials, restrict the key to the Android apps (package + SHA-1) and to the Firebase APIs used |
| F5 | FINE AS CODE | `packages/mobile-core/src/config/app-variant.js:7`–`8`; `packages/mobile-core/src/config/runtime.ts:32`–`33`; both `app.json` associated domains and intent filters | `link…` | The link hosts differ per environment, but they are compiled into native entitlements and intent filters, so an environment variable would not help: a new host needs a new build anyway. `APP_VARIANT` already selects staging | None. They appear in four places; a shared constant would stop them drifting |
| F6 | FINE AS CODE | `apps/backend/src/config/environment.ts:126`–`127`; `packages/mobile-core/src/account/public-pages.ts:7`–`8`; `apps/public-site/*` | `sopo…@`, `no-r…@`, `http…` (`app.` support and privacy pages) | Public support address and public pages the stores require. The two email values are only defaults; `EMAIL_FROM` and `EMAIL_REPLY_TO` override them | None |
| F7 | FINE AS CODE | `apps/backend/src/config/environment.ts:3`–`10`; `apps/backend/.env.example:12`; `apps/backend/src/development-fixtures/development-fixtures.ts:3`; `apps/staff-mobile/.maestro/seed.mjs:20`; `.github/workflows/ci.yml:115`, `:128`, `:268`–`271`; `apps/backend/Dockerfile` (`prisma:generate` step) | `AAAA…`, `loca…`, `emma…`, `post…`, `s3mo…` | Local and CI-only values. Production refuses each local default by name (`superRefine` in `environment.ts`); the fixtures entry point throws when `NODE_ENV=production`, which staging also runs with; the CI and build database URLs point at throwaway or unreachable databases | None |
| F8 | FINE AS CODE | History: `apps/backend/src/script-runner/script-environment.spec.ts`, `apps/backend/src/backup/*.spec.ts`, `docs/testing-guide.md:6364`, `apps/backend/src/system-identity/security/argon2-password-hasher.ts` | `post…` (`avnadmin:sec…@db.example…`), `AKIA…`, `http…/heartbeat/abc`, `$arg…` | Test fixtures: an `example` database host, AWS's documented example key, a dummy heartbeat path, and a constant-salt dummy hash used to equalise login timing | None |
| F9 | FINE AS CODE | e.g. `apps/backend/src/booking/sessions/session-start-checks.ts:24` | `Amer…` | `America/La_Paz` is a domain rule (the studio's civil time), not deployment configuration | None |
| F10 | FINE AS CODE | `apps/backend/src/deployment/*`, `apps/backend/src/notifications/push/*`, email sender | `http…` (`api.resend.com`, `exp.host`, `api.northflank.com`, `api.github.com`) | Vendor API endpoints, the same in every environment | None |
| F11 | FINE AS CODE | `docs/architecture/infrastructure.md:120`–`131`; `docs/runbooks/production-release.md:302` | `1121…` (Cloudflare account), `team…`, `prj_…` (Vercel), `5688…` (Play), `emma…` (Aiven host) | Account and project identifiers without credentials, kept on purpose so operators know where things are. The Aiven URL in the runbook builds the password from a hidden prompt (`%s`), never inline | None while the repository is private. If it ever becomes public, move this table to the owner's password manager |

## Observations (not hardcoded values)

- **CI scans new commits, not old ones.** The `secrets` job in `ci.yml` runs
  gitleaks over each pull request's commits and each push to `main`. Commits
  before EXT-019 (2026-10-21) were never scanned by CI. This audit's scan of
  the full history found nothing, but a one-time `gitleaks detect` over the
  whole history with the real ruleset is cheap confirmation. There is no
  `.gitleaksignore`, which matches «no real secret was ever committed».
- **`ADMIN_WEB_PROXY_SECRET` is optional in production.**
  `apps/backend/src/config/environment.ts:47` lets it default to `null` even
  when `NODE_ENV=production`, unlike the link keys. The runbook notes it was
  once missing on Vercel. Requiring it in production, like the other secrets,
  would turn a silent misconfiguration into a failed boot.
- **Store review passwords go to job logs.**
  `apps/backend/src/script-runner/scripts/store-review-accounts.ts:174`
  prints the generated reviewer passwords in the Northflank job log by design.
  Anyone with Northflank log access can read them until they are rotated by
  the next run.
- **Personal data in docs.** `docs/implementation/BACKLOG.md:177` names a
  developer's personal Gmail (`r35d…@gmail.com`) as a test recipient, and
  `docs/design/prompts/admin-web/35-contactos-promociones.md:51`–`53` uses
  sample rows with real-looking Gmail and Hotmail addresses and phones. If
  those samples are real people, replace them with `example.com` addresses.

## What to rotate

Nothing. No live credential was found in the code or the history, so no
rotation follows from this audit. The 2026-10-31 rotation in
`docs/runbooks/secrets-rotation.md` stands.

## Top five actions

1. Merge `fix/ios-universal-links` (T1) and verify the AASA on both link
   hosts, then an email link opening the app on an iPhone.
2. Confirm the APNs key is on EAS for both apps and a push reaches a real
   iPhone (T4).
3. Move the production API URL in `release-production.yml` and the
   production coordinates in `copy-production-to-staging.yml` to repository
   variables (S1, S3).
4. Decide how the admin web reaches the API without hardcoded `code.run`
   hosts: a custom API domain or a middleware proxy (S2).
5. Bring the docs up to date with the Apple account: infrastructure doc,
   rotation runbook rows for the Apple credentials and `EXPO_TOKEN`, and an
   App Store button on the link fallback page (T2, T3, T5).
