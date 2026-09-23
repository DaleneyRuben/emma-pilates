---
name: coding-standards
description: Pilates-specific engineering standards for code, tests, database changes, business logic, architecture boundaries, and delivery. Read before making any implementation or engineering-documentation change in this repository.
---

# Pilates coding standards

These standards apply regardless of which AI assistant, editor, or command-line tool is used.

## Inherited baseline

This project specializes the user's global [coding standards](/Users/rubendaleney/.agents/skills/coding-standards/SKILL.md). Read that skill first when it is available. This file restates its operative rules so contributors on other machines and AI tools can follow the project without depending on that absolute path.

If the global and project standards differ, follow the stricter rule unless it conflicts with a direct user instruction. Accepted ADRs remain authoritative for architecture choices.

## Required context

Before changing domain terms or business behavior:

1. Read [`CONTEXT-MAP.md`](../../../CONTEXT-MAP.md).
2. Read the affected bounded context's `CONTEXT.md` and ADRs.
3. Read the relevant project-wide ADRs in [`docs/adr/`](../../../docs/adr/).
4. Ask for explicit approval before changing or extending business behavior.

Do not invent synonyms for defined domain terms. Keep Booking & Membership, Back Office, and system identity ownership explicit.

## Test-driven development

Use Red → Green → Refactor for every behavior change:

1. Write the smallest test that describes the intended behavior.
2. Run it and confirm it fails for the expected reason.
3. Write the minimum implementation needed to pass.
4. Run the relevant tests and confirm they pass.
5. Refactor only while the tests remain green.

Never write implementation behavior before observing the corresponding failing test. Do not weaken assertions to make an incorrect implementation pass. Documentation-only and configuration-only changes do not require invented tests; validate them with the relevant formatter, validator, or consistency check.

Use the narrowest meaningful test level:

- Unit tests for domain rules and application decisions.
- Integration tests for Prisma repositories, PostgreSQL behavior, transactions, and cross-schema report queries.
- API contract tests for OpenAPI compatibility, RFC 9457 errors, authorization, and current/previous mobile release support.
- Architecture tests for bounded-context imports, module exports, and prohibited direct Prisma access.
- End-to-end tests for critical user journeys once the surface-specific tools are selected.

## TypeScript and code style

- Use TypeScript for backend, mobile, admin web, shared tooling, and tests, as established by ADR-0012.
- Follow the Airbnb JavaScript style guide until repository lint and formatting configuration makes a rule more specific.
- Prefer explicit types at public module and transport boundaries. Do not use `any` to bypass modeling or validation; narrow `unknown` values at their boundary.
- TypeScript types do not replace runtime input validation, authorization, database constraints, or compatibility tests.
- Extract genuinely reusable logic. Do not create speculative abstractions or copy-paste behavior between contexts.
- Write comments only when the reason, invariant, or tradeoff is non-obvious. Do not narrate what the code already states.
- Keep secrets, provider SDK types, Prisma types, NestJS types, and transport DTOs out of domain models.

### Functions and classes

- Prefer plain functions for stateless calculations, parsing, validation,
  formatting, workflow helpers, and React components.
- Use classes when NestJS decorators or dependency injection, Swagger runtime
  metadata, lifecycle hooks, or genuinely stateful infrastructure materially
  benefit from them.
- Stateful adapters may use classes to keep cohesive dependencies and resource
  lifecycle together. Keep framework and infrastructure classes outside domain
  models.
- An application use case may be a class when constructor injection gives it a
  clear public interface, but a single `execute` method does not by itself
  justify a class. Prefer a function or factory when it expresses the same
  behavior more directly.
- Do not create a class merely to wrap one unrelated function, imitate a Java
  pattern, or make a module appear architectural. Every class must have a
  concrete framework, metadata, lifecycle, state, or interface reason.

## Monorepo and module boundaries

- Use the pnpm workspace layout accepted in ADR-0013: deployables under `apps/`, narrow shared packages under `packages/`.
- Shared packages may contain API contracts, tooling configuration, and generic test support. They must not become a path for sharing backend domain entities, repositories, or Prisma models with clients.
- Applications may depend on approved workspace packages; packages must not depend on applications, and applications must not depend on one another.
- Mobile and admin web consume `api-contracts`; backend code must not consume the generated client because the backend transport code is its source.
- Treat `tooling` as a development-only dependency and `test-support` as a test-only dependency. Do not create a general-purpose `shared` package without a concrete, neutral responsibility.
- Import workspace packages by their declared package name and public `exports`. Do not deep-import package source or use TypeScript path aliases to bypass a public entrypoint.
- Enforce workspace, bounded-context, and infrastructure import restrictions with scoped core ESLint `no-restricted-imports` rules. A forbidden import is a lint error locally and in CI.
- Use focused Jest architecture tests for public package entrypoints, NestJS module exports, prohibited direct Prisma access, and structural boundaries that import-pattern lint rules cannot express reliably.
- Booking & Membership, Back Office, and system identity are top-level NestJS modules with small public application interfaces.
- Cross-context writes call the owning module's public application service. Never reach into another context's repositories, internal providers, or database tables to perform a write.
- Keep domain rules and state transitions in framework-light TypeScript. NestJS owns transport, guards, dependency wiring, and application composition.

## Persistence

- PostgreSQL schemas are owned by their bounded contexts according to ADR-0011.
- Prisma is an infrastructure detail used through context-owned repository adapters. Controllers and application use cases must not inject Prisma Client directly.
- Never create, modify, apply, or reset a migration without explicit user approval. Present the proposed schema and migration impact first.
- Never use schema pushing or runtime auto-synchronization in production.
- Protect concurrency-sensitive workflows with database constraints and short, deliberate transactions using an explicit isolation and bounded-retry strategy.
- Raw SQL must be parameterized, live inside the owning infrastructure adapter, and be covered by an integration test.

## REST and OpenAPI boundary

- Application endpoints live under a major URI version beginning with `/api/v1`.
- NestJS controllers and transport DTOs are the OpenAPI source of truth. DTOs are not domain entities or Prisma models.
- Mobile and admin clients consume the generated `api-contracts` package instead of importing backend source types.
- Model business state changes as explicit commands rather than generic CRUD over persistence records.
- Return errors as RFC 9457 Problem Details with stable project-owned codes. Clients branch on the stable code, never on human-readable text.
- Keep every backend deployment compatible with the current and immediately previous mobile release.

## Design artifacts

Never edit files under `design/`. Read and follow [`design-workflow`](../design-workflow/SKILL.md) for any design-related task.

## Surface verification

Automated tests prove behavior; they do not prove that a screen looks and works the way the design and the person using it expect. Before marking any item done, exercise the change on its real surface:

- **Mobile** (`apps/client-mobile`, `apps/staff-mobile`, `packages/mobile-core`): run the affected journey in the iOS Simulator on an **iPhone and an iPad**, with the API on a disposable or development database, following the fixture Accounts and steps in `docs/testing-guide.md`. Use Maestro flows where they exist and add one for a new critical journey. The iPad run matters even for phone-first screens: the Assistant works on a tablet and layouts must adapt, not just scale.
- **Admin web** (`apps/admin-web`): open the change in a **real browser** against the Vite dev server (`pnpm dev:admin`), at the 1440 px desktop reference and at a 420 px narrow width, and walk the affected pages, dialogs, and forms. Browser automation with screenshots counts; Jest with jsdom, a build, or a curl smoke does not, because none of them renders the styles.
- **Backend-only** changes still need the API journey exercised end to end (curl or Swagger against `pilates_dev_sim`, as the testing guide describes), and if the change alters what a screen shows, the surface check above too.

Compare what you see with the governing design prompt and the design system, fix discrepancies before marking done, and record in the backlog evidence which device or browser and width you verified on, what you did, and what you saw. Report plainly when a surface check could not be run (no Simulator, no browser access) instead of implying it happened.

## Completion and commits

Before calling a change complete, run the narrowest relevant tests plus configured lint, formatting, type checking, schema, and contract validation for the affected files, and the surface verification above. Report anything that could not be run.

Create an atomic commit after each meaningful implementation checkpoint once its relevant tests are green. Do not batch unrelated work into a later commit.

Every commit must use the project [`commit`](../commit/SKILL.md) skill. Invoke `$commit` in Codex, `/commit` in clients that expose slash skills, or read and execute that skill directly when native invocation is unavailable. Do not run `git commit` through an improvised workflow.
