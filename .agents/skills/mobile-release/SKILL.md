---
name: mobile-release
description: How a mobile change reaches testers and the stores — OTA or a new store build, the patch/minor/major version standard, the GitHub Actions workflows, and what needs the owner's OK. Read before publishing an OTA, building with EAS, or creating a release branch.
---

# Mobile release

The step-by-step reference is the [mobile release runbook](../../../docs/runbooks/mobile-release.md). The decisions behind it are [ADR-0038](../../../docs/adr/0038-use-eas-build-and-submit-for-manual-mobile-releases.md), [ADR-0039](../../../docs/adr/0039-use-controlled-eas-updates-for-small-mobile-fixes.md), and [ADR-0107](../../../docs/adr/0107-trigger-mobile-releases-from-github-actions.md). This skill is what to decide before you press anything.

## 1. OTA or a store build

- **OTA** (`Publish OTA`): JavaScript, copy and styles only. The `fingerprint` runtime policy (FIX-011) delivers it only to binaries with the same native fingerprint. An OTA never changes `expo.version`.
- **Store build**: anything native. That means a new native module (for example `expo-clipboard`), a config plugin, a permission, an SDK upgrade, or any other change to the fingerprint. Installed apps never receive it as an OTA, so each app that changed needs its own build.
- When the JavaScript calls a new API, the backend has to reach production before testers can use that screen. Until then the screen must degrade gracefully.

## 2. The version standard (owner, 2026-11-03)

Store builds follow semver. Nobody types the version: **Create native release** asks for the bump and computes the number (`scripts/expo-version.mjs`).

| Bump | When | Example |
| --- | --- | --- |
| `patch` (default) | Fixes and adjustments with nothing new to use, or a native build only for a library or a permission | 1.0.2 → 1.0.3 |
| `minor` | Something new that a Client or the team can use | 1.0.3 → 1.1.0 |
| `major` | A full redesign, or a forced update because the old version stops working with the API | 1.4.0 → 2.0.0 |

If a release mixes fixes and something new, it is `minor`. The build number (Android versionCode) is separate: EAS raises it on every build (`appVersionSource: remote`). Decision record: [decisions §18.15](../../../docs/decisiones-emma-pilates.md).

## 3. The path, always through the workflows

1. Merge the change into `main` and wait for that commit's CI to pass.
2. Run **Create native release** with the app and the bump. It opens a `release/<app>-x.y.z` pull request. Merge that pull request only after the version is published in the stores.
3. Run **Store deploy** from that release branch, with the app and `android`. It builds with EAS and submits to Play's internal track. iOS stays refused until gate 9.
4. For an OTA, run **Publish OTA** on `preview` first and on `production` after.

A local `eas build` is only the fallback for when Actions or EAS are down. It never replaces the workflows on a normal day, and never runs from an unmerged branch.

## 4. Ask the owner first

- Every store build spends one of the month's 15 free builds per platform. State the count before dispatching one.
- **Store deploy** submits to Play by itself. Run it only with the owner's OK for that release, or let the owner run it herself.
- Staging costs money while it runs. Resume `api` and `worker` to test a release against it and pause them after (AGENTS.md).
