# Runbook: release the Client and Staff mobile apps

Follows [ADR-0038](../adr/0038-use-eas-build-and-submit-for-manual-mobile-releases.md)
(manual EAS Build and Submit) and
[ADR-0039](../adr/0039-use-controlled-eas-updates-for-small-mobile-fixes.md)
(controlled EAS Updates). Each app (`apps/client-mobile`, `apps/staff-mobile`)
is released separately with its own `eas.json` and store identity
(`com.emmapilates.client`, `com.emmapilates.staff`; ADR-0085).

## Gated: accounts that must exist first

These steps cannot run until the owner sets up the accounts listed in the
backlog's "External accounts and provider gates" table. Done on 2026-10-14
(REL-001, gate 6): the Expo organization `emma-pilates` with one EAS project
per app (`extra.eas.projectId` and `owner` in each `app.json`), and
`expo-updates` with each project's update URL. Also done: both Play Console
apps with Play App Signing and the `play-submit` service account (REL-002,
2026-10-15 and 2026-10-19), and `EXPO_PUBLIC_API_URL` in each project's EAS
`production` environment (the Northflank production API) and `preview`
environment (the staging API, EXT-017).

EAS has three fixed environment names, so the `staging` build profile and
channel read the `preview` environment; there is no `preview` profile or
channel.

Still to come:

- an Apple Developer team and App Store Connect records for both bundle IDs
  (gate 9);
- EAS environment variables for readable mobile stacks (EXT-013) in the
  `preview` and `production` environments of both projects (the DSN,
  `EXPO_PUBLIC_ERROR_REPORTING_DSN`, has been set as plain text in all three
  environments since 2026-10-15, through `eas env:set` from each app
  folder): `SENTRY_URL`, `SENTRY_ORG`, and `SENTRY_PROJECT` (plain text, from the application's Advanced settings in Better Stack) with
  `SENTRY_AUTH_TOKEN` (secret, a Telemetry API token). Every profile sets
  `SENTRY_ALLOW_FAILURE`, so a build without them succeeds and its log shows
  the failed upload; the native debug-file uploads are off because Better
  Stack does not take them. An EAS Update must be published with
  `--environment production` (or `preview` for the `staging` channel) so it carries the DSN, and its
  maps go up with `pnpm exec sentry-expo-upload-sourcemaps dist` from the app
  folder afterwards.
- for iOS push, an APNs key from the Apple Developer team, added to each EAS
  project with `eas credentials` (iOS → Push Notifications) before the first
  iOS store build; Android push already works (below).

## Development builds (EAS, no store account needed)

`eas build --platform all --profile development --non-interactive --no-wait`
from the app folder builds the development client for the iOS Simulator and
an Android `.apk` (testing guide, Test 45). Run `eas whoami` first: it must be
`daleneyfernando`, because this Mac also has a work Expo login. Every profile
extends `base` (Node 24.13.0, the workspace's pnpm, and
`SHARP_IGNORE_GLOBAL_LIBVIPS=1`, without which the backend's `sharp` tries to
compile on the macOS builder and the install fails). Each build spends one of
the free plan's monthly builds (15 iOS and 15 Android); a JavaScript change
needs none, a native change needs a new one per app and platform.

## Push credentials (NOT-002)

- **Android:** each app's `google-services.json` (Firebase project
  `emma-pilates`, committed, not a secret) is wired by `googleServicesFile`
  and the `expo-notifications` plugin in `app.json`, so a change to either
  needs a new native build. The FCM V1 service account key sits in each EAS
  project's Android credentials and is used by Expo's servers, so replacing
  it needs no build.
- **iOS:** waits for the APNs key (gate 9). Development builds still register
  and show pushes sent with `xcrun simctl push` (testing guide, Test 46).
- **Sending:** the worker sends through Expo Push Service with the
  `push-sender` robot's `EXPO_ACCESS_TOKEN`; enhanced push security is on, so
  a release whose worker lacks the token sends nothing (each push fails and is
  reported). Where each credential lives and how to rotate it is in
  [infrastructure](../architecture/infrastructure.md).

## Google Play Internal testing (REL-006)

Since 2026-10-15 both apps exist in the Play Console under the personal
developer account «Daleney Labs» (`docs/architecture/infrastructure.md`).

- **Build:** `eas build --profile production --platform android
  --non-interactive --no-wait` from each app folder spends one of the free
  plan's monthly Android builds. EAS keeps the `versionCode` itself
  (`appVersionSource: remote`, FIX-011): `app.json`'s value is ignored and
  nothing is committed. `EXPO_PUBLIC_API_URL` comes from the EAS
  `production` environment (the Northflank API).
- **First upload by hand:** Google accepts an app's first bundle only through
  the console: Test and release → Testing → Internal testing → Create new
  release → Upload the `.aab` from the build page → release notes in
  `<es-419>` tags → Next → Save and publish. The only expected warning is
  the missing deobfuscation file (R8 is off). Later uploads use
  `eas submit --profile production --platform android` with the Play service
  account `play-submit@emma-pilates.iam.gserviceaccount.com` (REL-002), saved
  on the Expo account and selected on both store identifiers. It may release
  to testing tracks only; production access is added for the Client app at
  REL-007. To replace the key: Google Cloud → IAM & Admin → Service accounts →
  `play-submit` → Keys, create a JSON key, choose it in each app's Expo
  credentials, then delete the old key in Google Cloud.
- **Testers:** the email list «Equipo interno» is shared by both apps; each
  app's Testers tab has the «Join on the web» link. A tester opens it in a
  browser signed in with a listed Google account, accepts, and installs; the
  Play Store on the device must use that same account, or it answers «item
  not found». Until the store listing is reviewed, testers see the
  temporary name `com.emmapilates.<app> (unreviewed)`.

## Confirm a Client's email by hand (fallback)

Production sends verification email through Resend since EXT-001
(2026-10-19). Before that, a Client who registered in the app stayed
unverified, and this command was the workaround. Keep it for an email that
does not arrive (a full daily quota, a suppressed address). From the
Northflank `api` shell (Services → `api` → Shell), confirm their queued
verification by email:

```sh
node dist/src/client-email-verification-main.js <their email>
```

It prints `{"event":"client_email_verification","status":"verified"}` (exit
0); `not_found` means no current verification is queued for that address
(already used, expired after 24 hours, or a typo). The command reads the
newest current link with the worker's own checks and sends it to the API's
`POST /api/v1/client-email-verifications` on the same host; the secret is
never printed. Then the Client logs in with their email and password.

## Before every release (local, no account needed)

Run from the commit you intend to release, with CI green for it:

```sh
pnpm --filter @pilates/client-mobile test && pnpm --filter @pilates/staff-mobile test
pnpm --filter @pilates/client-mobile typecheck && pnpm --filter @pilates/staff-mobile typecheck
pnpm check:api && pnpm check:api-compat
EXPO_PUBLIC_API_URL=https://<api-host> pnpm --filter @pilates/client-mobile release:smoke
EXPO_PUBLIC_API_URL=https://<api-host> pnpm --filter @pilates/staff-mobile release:smoke
```

`release:smoke` exports the production, minified Hermes bundles for iOS and
Android and fails if either cannot be built. Then run the Maestro critical
journeys against freshly applied fixtures (see the testing guide, Test 19).

## Native release (EAS Build and Submit)

1. Confirm `expo.version` in the app's `app.json`. A native change (new
   native module, permission, SDK upgrade, or a fingerprint-affecting config
   change) needs a new store build, because the `fingerprint` runtime policy
   (FIX-011) ties OTA updates to the native fingerprint rather than the
   marketing version.
2. `cd apps/<app> && eas build --profile production --platform all`
   (`autoIncrement` raises the build number on EAS; `appVersionSource` is
   `remote`, so Android `versionCode` is stored on EAS rather than committed).
3. Install the `staging` profile build (Test 55), or the production build through
   TestFlight/internal testing, and run the Maestro journeys with
   `APP_ID=com.emmapilates.<app>`.
4. `eas submit --profile production --platform ios|android` and publish from
   each store console when review passes.
5. Once the release is live, move the API compatibility baseline to the
   release that is now previous (`apps/backend/openapi/README.md`).

## Small fixes (EAS Update)

Only JavaScript, copy, style, and asset fixes that need no native change:

1. `eas update --channel staging --environment preview --message "<fix>"` and
   verify on a staging build with the same runtime version.
2. `eas update --channel production --message "<fix>" --rollout-percentage 10`.
3. Review launch and error signals; expand with `eas update:edit` or roll back
   with `eas update:republish` of the previous group. Never promote only
   because time passed.

## From GitHub Actions (REL-008, ADR-0101)

Three workflows replace the workstation commands above. Each is
`workflow_dispatch` only. None runs on merge. All three stop before calling
Expo when the `EXPO_TOKEN` secret is absent. That token is an Expo robot user
of the `emma-pilates` organization, stored by the owner as a GitHub Actions
secret. Until the owner creates it, dispatching a workflow fails at that
check and publishes nothing.

- **Publish OTA** (`mobile-publish-ota.yml`), from `main` only, after that
  commit's CI run is green. Choose channel `preview` first: the workflow
  publishes that gate to the `staging` update channel with `--environment
  preview` (testers use staging builds; there is no `preview` channel).
  Channel `production` is refused unless the preview dispatch of the same
  commit recorded a git note `preview-ota:<app>:<sha>` (notes are fetched
  before the guard and appended so a second app does not overwrite the
  first). Rollout percentage applies to production. The OTA message and
  rollout are passed through `env:`, never interpolated into the script
  from workflow inputs.
- **Create native release** (`mobile-create-release.yml`) opens a pull
  request from `release/<app>-x.y.z` that bumps that app's `expo.version`.
  Merge it only after the store version is published. Merging earlier stops
  OTA updates from reaching installed builds of the previous version.
- **Store deploy** (`mobile-store-deploy.yml`) runs from that release branch.
  Android builds with `eas build --profile production --auto-submit` to
  Play's internal track and spends one free-plan build. iOS is refused
  until gate 9 (the Apple Developer account). The workflow does not promote
  a track to production.

A local `eas build` remains the fallback when Actions, EAS, or the free
allocation is unavailable. State the build count before dispatching a native
build.
