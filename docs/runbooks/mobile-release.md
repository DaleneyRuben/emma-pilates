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
`expo-updates` with each project's update URL. Still to come:

- an Apple Developer team and App Store Connect records for both bundle IDs;
- a Google Play Console app entry and upload key for both packages;
- EAS environment variables `EXPO_PUBLIC_API_URL` for the `preview` and
  `production` environments (the https API hosts from EXT-003).
- EAS environment variables for readable mobile stacks (EXT-013) in the
  `preview` and `production` environments of both projects (the DSN,
  `EXPO_PUBLIC_ERROR_REPORTING_DSN`, has been set as plain text in all three
  environments since 2026-10-15, through `eas env:set` from each app
  folder): `SENTRY_URL`, `SENTRY_ORG`, and `SENTRY_PROJECT` (plain text, from the application's Advanced settings in Better Stack) with
  `SENTRY_AUTH_TOKEN` (secret, a Telemetry API token). Every profile sets
  `SENTRY_ALLOW_FAILURE`, so a build without them succeeds and its log shows
  the failed upload; the native debug-file uploads are off because Better
  Stack does not take them. An EAS Update must be published with
  `--environment production` (or `preview`) so it carries the DSN, and its
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
  plan's monthly Android builds and bumps `expo.android.versionCode` in
  `app.json`; commit that bump. `EXPO_PUBLIC_API_URL` comes from the EAS
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

## Client Accounts on production before email (EXT-001)

Production cannot send verification email until EXT-001, so a Client who
registers in the app stays unverified. From the Northflank `api` shell
(Services → `api` → Shell), confirm their queued verification by email:

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

## Native release (EAS Build and Submit) — gated

1. Confirm `expo.version` in the app's `app.json`. A native change (new
   native module, permission, or SDK upgrade) needs a new version, because the
   `appVersion` runtime policy ties OTA updates to it.
2. `cd apps/<app> && eas build --profile production --platform all`
   (`autoIncrement` raises the build number; `appVersionSource` is `local`).
3. Install the `preview` profile build, or the production build through
   TestFlight/internal testing, and run the Maestro journeys with
   `APP_ID=com.emmapilates.<app>`.
4. `eas submit --profile production --platform ios|android` and publish from
   each store console when review passes.
5. Once the release is live, move the API compatibility baseline to the
   release that is now previous (`apps/backend/openapi/README.md`).

## Small fixes (EAS Update) — gated

Only JavaScript, copy, style, and asset fixes that need no native change:

1. `eas update --channel preview --message "<fix>"` and verify on a preview
   build with the same runtime version.
2. `eas update --channel production --message "<fix>" --rollout-percentage 10`.
3. Review launch and error signals; expand with `eas update:edit` or roll back
   with `eas update:republish` of the previous group. Never promote only
   because time passed.
