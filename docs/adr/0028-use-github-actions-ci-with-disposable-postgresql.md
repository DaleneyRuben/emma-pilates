# Use GitHub Actions CI with disposable PostgreSQL

Status: accepted

GitHub Actions will be the repository's continuous-integration gate. Pull requests and commits intended for production must pass the configured formatting, linting, type-checking, test, architecture, migration, and API-contract checks that apply to their changes. Database-dependent checks provision an isolated PostgreSQL service container for that workflow run and build its schema from committed migrations; CI never connects to Aiven production data or credentials.

The initial environment model consists of developer-local environments, disposable CI environments, and production. Local development uses containerized PostgreSQL, CI resources exist only for the duration of a workflow, and the production API, worker, and database use the providers selected in [ADR-0027](./0027-deploy-the-initial-backend-on-northflank-with-aiven-postgresql.md). A production release may use provider Git integration or a deployment workflow, but it must identify and deploy a commit that passed CI. Production migrations remain an explicit deployment operation rather than an application-startup side effect.

For mobile store releases, [ADR-0038](./0038-use-eas-build-and-submit-for-manual-mobile-releases.md) assigns native builds and store uploads to EAS Build and EAS Submit. Those releases are manually triggered from a commit that passed this GitHub Actions gate; EAS does not replace or duplicate the repository's CI checks.

There will be no permanently deployed staging environment initially. Northflank's two free services are reserved for the production API and worker, and the Aiven Free database is reserved for production data. A shared staging database inside the production Aiven service was rejected because test data, migrations, connection use, and operator mistakes could affect production. A separately paid staging stack was rejected until the release frequency, team size, or operational risk justifies its recurring cost. Local-only manual validation was rejected because it cannot provide a consistent, reviewable release gate.
