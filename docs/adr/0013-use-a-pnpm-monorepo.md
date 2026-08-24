# Use a pnpm monorepo

Status: accepted

The backend, role-routed mobile app, and admin web app will live in one repository managed as a pnpm workspace. Deployable applications live under `apps/`; narrowly scoped shared packages live under `packages/`.

The initial shape is:

```text
apps/
  backend/
  mobile/
  admin-web/
packages/
  api-contracts/
  tooling/
  test-support/
```

Shared packages are limited to public API contracts, build and lint configuration, and genuinely generic test support. Booking & Membership and Back Office domain logic remains inside the backend modules that own it. Database models, repositories, domain entities, and use cases are not shared with client applications.

Workspace dependencies flow in one direction: applications may consume approved packages, packages never import applications, and applications never import one another. Mobile and admin web may consume `api-contracts`; the backend remains the OpenAPI source of truth and does not consume its generated client. `tooling` is development-only and `test-support` is test-only. Each package exposes an explicit public API through package exports, and consumers import that API by package name rather than deep-importing source files or bypassing the boundary with TypeScript path aliases. A general-purpose `shared` package will not be created initially.

A monorepo makes coordinated API and client changes atomic, keeps one dependency and tooling workflow, and suits a small team working across all three applications. pnpm provides workspace dependency management with strict package boundaries and efficient dependency storage.

Root workspace scripts will coordinate the standard `build`, `test`, `lint`, and `typecheck` tasks by delegating to package-owned scripts through pnpm's recursive and filtering commands. Dependency-aware ordering remains explicit through workspace dependencies, and local development and GitHub Actions invoke the same root commands. Turborepo and Nx will not be added initially; a dedicated task runner may be reconsidered if measured build time, repeated CI work, or task-graph complexity makes pnpm orchestration insufficient.

Core ESLint `no-restricted-imports` rules, scoped by application, package, bounded context, and infrastructure layer, will reject forbidden dependency directions and boundary bypasses during local linting and CI. Focused Jest architecture tests will verify structural rules that import patterns cannot express clearly, including public package entrypoints, NestJS module exports, and prohibited Prisma access outside context-owned infrastructure. A dedicated graph tool or boundaries plugin may be reconsidered if these rules become difficult to express or maintain.

Independent repositories were rejected for now because they add versioning and coordination overhead without independent teams or release ownership. The deployables remain independently buildable even though their source is colocated.
