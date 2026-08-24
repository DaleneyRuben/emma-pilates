# Run backend processes from one deployable package

Status: accepted

The API, pg-boss worker, and deployment migration runner will live in `apps/backend` and be built into the same versioned backend image. The package exposes separate commands: the API command starts the HTTP application, the worker command starts background-job consumers without starting the public HTTP application, and the migration command applies reviewed application and pg-boss schema migrations and then exits.

The API and worker have separate TypeScript bootstrap entrypoints and compose only the NestJS modules and infrastructure they require. Both reuse the bounded-context modules inside `apps/backend`; backend domain entities, repositories, and use cases will not be extracted into shared workspace packages merely to support separate processes. Each command validates its own configuration as required by [ADR-0051](./0051-validate-backend-configuration-with-nest-config-and-zod.md).

Northflank will run the same immutable image as separate API and worker services with different commands, and will run migrations from that image as an explicit one-off job before a compatible application release. This keeps code and migrations on the same revision while preserving independent process failure, restart, and scaling boundaries. Neither long-running process runs migrations automatically.

Separate `apps/api` and `apps/worker` applications were rejected because they would force backend business modules into shared packages or duplicate them, weakening the modular-monolith structure for little initial benefit. Producing dedicated API and worker images from the same package was rejected for now because it adds parallel build and release artifacts; it can be reconsidered if measured image size, dependency isolation, or security requirements justify the operational cost.
