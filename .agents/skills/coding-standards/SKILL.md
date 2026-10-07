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

### File size and reuse

- **A source file holds at most 400 lines of code.** This applies to every hand-written `.ts` and `.tsx` file, tests included; generated output (`packages/api-contracts/src/generated`, the Prisma client, `design/`) and migrations are exempt. Split by responsibility (one adapter's read side and write side, one controller per resource, one spec file per behavior group), never by arbitrary line count.
- Several files written before this rule are larger (the Prisma payment, evaluation, and booking command adapters, the development fixtures, the administration controller, the mobile authentication flow). Do not grow them: when a change touches one, put the new behavior in its own module and, where the change already forces it, move the part you are editing out with it. Do not refactor them wholesale in an unrelated commit.
- **Before implementing anything new, read what already exists.** Search the affected context and the shared packages (`mobile-core`, `api-contracts`, `src/database`, `src/time`, `src/http`) for the same rule, helper, query, component, or copy, and decide explicitly whether to reuse it, extract it into a shared module and reuse it, or write something new because the cases genuinely differ. Record that decision in the backlog evidence when it is not obvious from the diff.
- Extract shared logic at the moment the second use appears, into the narrowest home that both users may depend on under the monorepo boundaries below. Do not extract for a use that does not exist yet.

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
- Nothing in the database is ever physically deleted ([ADR-0086](../../../docs/adr/0086-soft-delete-every-database-row.md)). A removal is an existing end state or a `deleted_at` column; never call Prisma `delete`/`deleteMany` or run raw `DELETE`/`TRUNCATE` in production code. Foreign keys are `ON DELETE RESTRICT`, uniqueness that removed rows must not block is partial on `deleted_at IS NULL`, and every active read excludes removed rows.
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

## Branches and pull requests

Every change reaches `main` through a pull request. This applies to code, generated contracts, design exports, documentation, and backlog-only edits alike; there is no «small enough» exception.

- **Never commit on `main` and never push to it.** Start every piece of work by updating `main` (`git switch main && git pull --ff-only`) and branching from it. The commit skill refuses to commit while `main` is checked out.
- **One branch and one pull request per backlog item** (or per design follow-up, handoff, or standards change when that is the whole unit of work). Name the branch `<type>/<item>`: a type prefix, then the backlog ID and a short description in lowercase with hyphens. The types are `feature/` for new or changed behaviour the user can see or call (`feature/web-011-admin-review-findings`), `fix/` for a defect or regression (`fix/be-017-drop-orphaned-test-databases`), and `chore/` for everything else: tooling, CI, dependencies, renames, documentation, standards, and backlog-only edits (`chore/be-016-boot-without-job-runtime`, `chore/mob-050-mobile-lint`, `chore/standards-branch-prefixes`). A later branch for the same item keeps the ID and names the part (`chore/ext-004-ci-path-filters`). Branches made before this rule (2026-10-07) keep their names.
- **Keep the commit history on the branch.** The red → green → refactor checkpoints and the separate mark-done commit stay as individual commits, because the backlog's Evidence column cites their hashes. Pull requests are therefore merged with a merge commit, never squashed and never rebased, so the cited hashes survive on `main`.
- **The pull request is the handoff.** Open it with `gh pr create` when the item is marked done (or when the session stops partway, as a draft). The title is the backlog ID and the item in lowercase, like a commit message (`ext-004 add github actions ci`). The body follows [`.github/pull_request_template.md`](../../../.github/pull_request_template.md): what changed, how it was verified with the exact counts and the surfaces exercised, the decisions taken under the blanket approval, and leftovers, in the same words as the item's Evidence column. Like commit messages, pull request descriptions carry no AI attribution.
- **The user merges.** A session opens the pull request, records its URL in the item's Evidence column and in the session handoff note, and stops; it never merges, closes, or force-pushes. CI (EXT-004) must be green before merging; `main` is protected with required status checks, required pull requests, and no force pushes, and the protection applies to administrators too.
- **A session that finds the previous item's pull request still open** branches from `main` anyway and says so in its handoff; it does not stack branches. If the new work depends on the unmerged change, it stops and asks the user to merge first.
- Pre-existing direct commits on `main` from before this rule (2026-10-07) stay as they are; nothing is rewritten.
