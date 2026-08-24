# Use EAS Build and EAS Submit for manual mobile releases

Status: accepted

Production iOS and Android binaries will be created with EAS Build, using Expo's free service allocation while it remains sufficient for the project's release frequency. EAS Submit will upload approved production binaries to App Store Connect and Google Play. The Apple Developer Program and Google Play developer-account fees remain expected external costs; the project will not automatically move to a paid EAS plan.

A mobile store release is manually triggered from an explicit Git commit only after the applicable GitHub Actions checks have passed for that commit. Merging code, creating a tag, or finishing an EAS build will not by itself publish a release. The release operator remains responsible for selecting the commit and production profile, confirming its application version and platform build number, reviewing the result, and choosing when to submit it to each store.

GitHub Actions remains the repository's quality gate as established in [ADR-0028](./0028-use-github-actions-ci-with-disposable-postgresql.md); EAS is the mobile build and submission service, not a second CI system. Release credentials must be accessible to authorized project maintainers and recoverable if the project later leaves EAS. A documented local EAS build remains the fallback when the cloud service or free allocation is unavailable.

Automatically building or submitting on every merge was rejected because store releases are comparatively infrequent and should be deliberate. Building production apps entirely in GitHub Actions was rejected because iOS runners, native toolchains, signing credentials, and store submission would create more maintenance without improving the product. Maintaining only local release machines was rejected because it would make releases depend on one workstation, although local builds remain a useful fallback.

This decision covers native builds and store submission. [ADR-0039](./0039-use-controlled-eas-updates-for-small-mobile-fixes.md) separately limits over-the-air delivery to controlled, compatible fixes and defines its validation, rollout, and rollback boundary.
