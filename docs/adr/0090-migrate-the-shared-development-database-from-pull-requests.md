# Migrate the shared development database from pull requests

Status: superseded by [ADR-0091](./0091-retire-the-shared-development-environment.md)

Every push to a pull request that adds or changes a file under `apps/backend/prisma/migrations` applies that branch's committed migrations to the shared development database ([ADR-0045](./0045-maintain-a-shared-development-api-and-database.md), [ADR-0046](./0046-host-shared-development-on-render-and-neon.md)) with `prisma migrate deploy`, and so does every push to `main`. A GitHub Actions workflow does it with the Neon direct connection string held in the repository secret `DEV_DATABASE_URL`; nothing else in CI receives that secret. This is the explicit deployment step ADR-0045 requires, and it settles the development deployment cadence that ADR-0045 left open.

Until now the development schema only moved when someone migrated Neon from a Mac. Render deploys `main` on every merge, and the readiness check ([ADR-0080](./0080-separate-health-and-deployment-checks.md)) refuses a build whose migrations are not all applied, so a merged migration left every later deploy failing until the manual step ran. Migrating when the pull request is pushed means the schema is already in place when the merge deploys, and the database can be exercised from the development environment while the pull request is open.

Migrations are tested locally before they are pushed, so the owner accepts their risks on the shared database. Development data stays resettable, and these are the known consequences:

- `main`, which Render serves, may run against a schema ahead of it. Additive migrations are harmless; a migration that drops, renames, or tightens something `main` still uses can break the development API until the pull request merges.
- Prisma records each applied migration and never re-applies it. Editing, renaming, or abandoning a migration after a push leaves the database out of step with the repository; recover by resetting the development database and migrating from `main`.
- A failed migration blocks later deploys (Prisma P3009) until it is marked rolled back with `prisma migrate resolve` or the database is reset.
- Runs share one concurrency group and never cancel each other, so two pull requests never migrate at the same time.

Pull requests from forks never receive the secret and skip the step. Per-pull-request databases and lending the development API to one pull request at a time were considered and rejected by the owner in favor of this simpler flow.
