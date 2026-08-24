# Roll back admin web releases through Git reverts

Status: accepted

An admin-web production rollback will create a new Git revert commit that reverses the faulty frontend change. The normal GitHub Actions production workflow then validates, builds, and deploys that commit to Vercel under [ADR-0044](./0044-deploy-the-admin-web-to-vercel-through-github-actions.md). The revert commit becomes the auditable source of truth for the restored production behavior.

Rollback never rewrites or force-pushes `main`, deploys an uncommitted local build, or asks Vercel to rebuild an arbitrary dashboard selection. If several commits must be removed, maintainers create a deliberate revert commit or sequence whose resulting repository state passes all applicable checks. A correcting forward change follows the same pull-request, CI, and production-deployment path.

A provider-side instant rollback was rejected even though it could restore an earlier deployment faster. It would temporarily make the production domain serve code different from the tip of `main`, and the project accepts the extra recovery time required to preserve one Git-controlled release path. If GitHub Actions or Vercel is unavailable, the admin frontend remains on its current deployment until that path is restored rather than introducing an undocumented emergency mechanism.

This policy rolls back only static admin-web code and public build-time configuration. It never reverses a backend deployment or PostgreSQL migration. A frontend revert that is incompatible with the current API or schema must not be deployed; the incident instead requires a compatible forward fix or the separately defined backend and migration recovery procedure.
