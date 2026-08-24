# Deploy the admin web to Vercel through GitHub Actions

Status: accepted

The static admin web application will be hosted on the existing Vercel Hobby account. GitHub Actions will be the production release path: for an eligible commit on `main`, the workflow runs every applicable quality check, creates the Vite production build, and deploys that exact prebuilt output to Vercel only after all required jobs succeed. Vercel's direct Git integration may create the pull-request previews selected in [ADR-0047](./0047-create-immediate-protected-vercel-previews-for-pull-requests.md), but it must not independently promote pushes to the production domain.

The deployment job depends on the successful formatting, linting, type-checking, Jest, build, and other affected repository checks established in [ADR-0028](./0028-use-github-actions-ci-with-disposable-postgresql.md). It uses pinned project tooling and the Vercel CLI to deploy prebuilt output, records the source commit identifier with the deployment, and obtains deployment credentials from scoped GitHub Actions secrets. A failed check or deployment leaves the currently assigned production deployment unchanged.

The browser bundle may contain only deliberately public build-time configuration, such as its API base URL and release identifier. Backend credentials, database credentials, Vercel tokens, and other secrets must never be embedded in Vite-exposed environment variables or static assets. The generated output is treated as an immutable release artifact; Vercel does not rebuild different output from the same commit during this workflow.

Vercel's automatic Git production deployment was rejected because it can build and promote independently of the repository's selected GitHub Actions gate. A manually promoted production deployment was rejected initially because it adds an operator step to every static-web release without a current approval or rollout requirement. The workflow keeps the release automatic after validation while retaining Vercel's replaceable static-host role.

[ADR-0045](./0045-maintain-a-shared-development-api-and-database.md) establishes that Vercel admin-web previews call an isolated shared development API and database, and [ADR-0047](./0047-create-immediate-protected-vercel-previews-for-pull-requests.md) defines their trigger and access protection. Production-domain configuration, single-page-application fallback routing, cache headers, rollback operations, and the deferred cookie and CSRF integration remain separate delivery or implementation decisions.
