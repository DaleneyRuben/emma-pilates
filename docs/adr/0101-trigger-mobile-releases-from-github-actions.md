# Trigger mobile releases from GitHub Actions

Status: proposed

Amends [ADR-0038](./0038-use-eas-build-and-submit-for-manual-mobile-releases.md) and [ADR-0039](./0039-use-controlled-eas-updates-for-small-mobile-fixes.md). Those decisions keep every store binary and every over-the-air update as a manual act from an explicit commit whose GitHub Actions checks have passed. This decision keeps that boundary and moves the button from a workstation into three `workflow_dispatch` workflows, so a release does not depend on one Mac being logged into Expo.

The three workflows are the only new entry points:

- **Publish OTA** (`mobile-publish-ota.yml`). Inputs: app (`client`, `staff`, or `both`), channel (`preview` or `production`), message, and a rollout percentage. It runs only on `main`. Production is refused unless a preview update of the same commit is already published. The runtime stays `appVersion`, so an update reaches only binaries of that version.
- **Create native release** (`mobile-create-release.yml`). Inputs: app and the new `expo.version` (`x.y.z`). It opens a pull request from `release/<app>-x.y.z` that bumps only that app's `expo.version`. The pull request merges after the store version is published, because the `appVersion` runtime policy would otherwise stop updates from reaching installed builds.
- **Store deploy** (`mobile-store-deploy.yml`). Inputs: app and platform. It runs `eas build --profile production --auto-submit` from a `release/*` branch. Android submits to Play's internal track. iOS waits for the Apple Developer account (gate 9). Both stores of one version are published together; this workflow does not promote a track to production.

Nothing in these workflows runs on `push` or on `pull_request`. Merging to `main` still does not build or submit, which is the constraint ADR-0038 already accepted. Each workflow checks out the chosen commit, confirms that commit's CI run concluded successfully, and stops before any Expo call when the `EXPO_TOKEN` secret is absent. The token belongs to an Expo robot user of the `emma-pilates` organization and is stored as a GitHub Actions secret. Creating that robot user and storing the secret is an owner action; until it exists the workflows are inert.

A local `eas build` remains the fallback when the cloud service, the free allocation, or GitHub Actions is unavailable (ADR-0038). Each cloud build still spends one of the free plan's monthly builds, so the operator states the count before dispatching a native build.

Rejected: running the same commands from `workflow_run` after CI on `main` (a green merge would publish), storing the owner's personal Expo token (it is also the login of another Expo account on this Mac), and building the native app inside the GitHub runner (ADR-0038 already rejected that).
