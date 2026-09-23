# Runbook: release the Client and Staff mobile apps

Follows [ADR-0038](../adr/0038-use-eas-build-and-submit-for-manual-mobile-releases.md)
(manual EAS Build and Submit) and
[ADR-0039](../adr/0039-use-controlled-eas-updates-for-small-mobile-fixes.md)
(controlled EAS Updates). Each app (`apps/client-mobile`, `apps/staff-mobile`)
is released separately with its own `eas.json` and store identity
(`com.emmapilates.client`, `com.emmapilates.staff`; ADR-0085).

## Gated: accounts that must exist first

These steps cannot run until the owner sets up the accounts listed in the
backlog's "External accounts and provider gates" table:

- an Expo organization with one EAS project per app (`eas init` writes each
  `extra.eas.projectId` into `app.json`), and `expo-updates` installed with the
  project's update URL;
- an Apple Developer team and App Store Connect records for both bundle IDs;
- a Google Play Console app entry and upload key for both packages;
- EAS environment variables `EXPO_PUBLIC_API_URL` for the `preview` and
  `production` environments (the https API hosts from EXT-003).

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
