# Architecture roadmap

This document tracks which architectural areas are settled, which area is currently being discussed, and what remains before each application surface is ready to implement. It is an index and work queue, not a replacement for the project's accepted decisions, domain language, designs, or operational runbooks.

## Sources of truth

- [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md) defines the bounded contexts and points to their domain glossaries and context-specific ADRs.
- [`docs/adr/`](../adr/) contains system-wide decisions and trade-offs.
- [`booking/CONTEXT.md`](../../booking/CONTEXT.md) and [`back-office/CONTEXT.md`](../../back-office/CONTEXT.md) define the canonical domain language and business rules.
- [`docs/design/`](../design/) contains the design-system reference and screen prompts that describe the intended user journeys.
- [`AGENTS.md`](../../AGENTS.md) and the project skills under [`.agents/skills/`](../../.agents/skills/) define the engineering and delivery workflow.

Record a decision in an ADR only when it is hard to reverse, surprising without context, and the result of a meaningful trade-off. Put domain terms and business rules in the owning `CONTEXT.md`; put repeatable operational procedures in runbooks; put implementation rules in the project coding standards.

## Status meanings

- **Covered**: the important architectural decisions are accepted. Revisit only when a requirement or measured constraint changes.
- **In progress**: this is the single branch currently being resolved one decision at a time.
- **Queued**: important decisions remain, but they are not the current focus.
- **Deferred**: deliberately excluded from the initial release or postponed until a stated trigger occurs.

## Current focus

**Backend implementation stack and shared-package conventions** is the active architecture branch. [ADR-0012](../adr/0012-standardize-application-code-on-typescript.md) selects TypeScript, [ADR-0013](../adr/0013-use-a-pnpm-monorepo.md) establishes the workspace and narrow shared-package model, [ADR-0014](../adr/0014-use-nestjs-as-the-backend-application-shell.md) selects the NestJS modular-monolith shell, [ADR-0015](../adr/0015-use-prisma-for-postgresql-access.md) places Prisma behind context-owned repositories, [ADR-0018](../adr/0018-use-rest-with-an-openapi-contract.md) with [ADR-0019](../adr/0019-generate-openapi-from-nestjs-transport-code.md) establishes the REST contract, [ADR-0049](../adr/0049-use-jest-supertest-and-testcontainers-for-backend-tests.md) selects the backend testing foundation, [ADR-0050](../adr/0050-generate-api-contracts-with-orval.md) selects Orval and the committed generated-package workflow, [ADR-0051](../adr/0051-validate-backend-configuration-with-nest-config-and-zod.md) establishes fail-fast typed configuration, and [ADR-0052](../adr/0052-run-backend-processes-from-one-deployable-package.md) defines the single-package, multi-command process topology. The mobile and admin-web architecture branches are now covered; [ADR-0048](../adr/0048-rollback-admin-web-releases-through-git-reverts.md) completes the admin-web delivery decisions with Git-controlled rollback.

Resolved within this branch:

- [x] Use TypeScript in a pnpm monorepo with independently buildable applications and narrow shared packages.
- [x] Use NestJS as the modular-monolith shell with framework-light domain rules and context-owned public interfaces.
- [x] Use PostgreSQL with context-owned schemas and Prisma behind repository adapters.
- [x] Use code-first NestJS OpenAPI with a generated `api-contracts` package and URI major versioning.
- [x] Run pg-boss jobs in a separate worker process while keeping consistency-sensitive work synchronous.
- [x] Use Jest for backend tests, Nest testing utilities and Supertest for application and HTTP behavior, and Testcontainers for disposable PostgreSQL integration tests.
- [x] Generate the committed `api-contracts` package with Orval using native Fetch and TanStack Query integration; regenerate and verify it in CI.
- [x] Validate API, worker, and migration configuration at startup with Nest Config and entrypoint-specific Zod schemas.
- [x] Build one versioned `apps/backend` image with separate API, worker, and explicit one-off migration commands.
- [x] Coordinate package-owned build, test, lint, and type-check scripts with plain pnpm workspace commands initially.

Next decisions in this branch, in order:

- [ ] Define allowed workspace dependency directions and package public-entrypoint rules.
- [ ] Select automated enforcement for workspace and backend bounded-context boundaries.

Deferred pre-release requirement from the covered admin-web branch:

- [ ] Define and test cookie, CSRF, CORS or same-origin proxying, and browser-session integration using the actual admin-web and API origins. Do not ship the admin web before this security boundary is resolved.

## Coverage map

| Area | Status | Accepted foundation | Remaining architecture work |
| --- | --- | --- | --- |
| Domain language and boundaries | Covered, ongoing | Context Map; Booking & Membership and Back Office glossaries; Booking ADRs | Keep glossaries and context ADRs current as new rules crystallize. |
| Application surfaces | Covered | One role-routed Expo mobile app, separate admin web, urgent Administrator work split across surfaces | Revisit only if a new workflow challenges the urgent-mobile versus deliberate-desktop boundary. |
| Backend structure | In progress | TypeScript pnpm monorepo with plain pnpm task orchestration; NestJS modular monolith; context-owned module interfaces; one backend image with separate API, pg-boss worker, and migration commands; Jest, Nest testing utilities, Supertest, and disposable PostgreSQL through Testcontainers; Orval-generated API contracts; fail-fast typed configuration with Nest Config and Zod | Finalize shared-package dependency and automated-boundary conventions. |
| Persistence | Covered | PostgreSQL schemas per context; Prisma behind context-owned repositories; explicit migrations | Select transaction isolation, database constraints, and bounded-retry behavior for concurrency-sensitive workflows. |
| API contract | Covered | First-party REST; NestJS code-first OpenAPI; `/api/v1`; current and previous mobile releases; RFC 9457 errors; committed Orval-generated Fetch and TanStack Query client | Automate breaking-change comparison; define pagination, filtering, idempotency, authorization, and caching conventions as the first endpoints are designed. |
| Identity and access | Queued | Account boundary; backend-managed authentication; opaque Authentication Sessions; SendPulse behind a project-owned email-delivery interface; accepted session and initial abuse-control policies | Complete authentication-email client/network budgets, account-enumeration behavior, Administrator MFA, authorization matrix, audit events, and deferred impersonation design after stack definition. |
| Mobile architecture | Covered | Expo with React Native; generated REST client; Expo Push Service; React Navigation static configuration; TanStack Query; React Hook Form with Zod; local React state and narrow Context; online-first read-only cache in AsyncStorage; credentials in SecureStore; verified HTTPS links through one authenticated ingress; Jest, React Native Testing Library, and Maestro; manual EAS Build and EAS Submit store releases after CI; controlled EAS Updates for small compatible fixes | Set cache lifetime and storage limits during implementation; revisit only when a native or product requirement challenges the accepted boundaries. |
| Admin-web architecture | Covered | Vite, React, and TanStack Router; static SPA; project-owned shadcn/ui components with Tailwind design tokens and Radix behavior; TanStack Table; React Hook Form with Zod; TanStack Query with local React state and narrow Context; Jest, React Testing Library, MSW, and Playwright; GitHub Actions production deployments to Vercel; immediate protected Vercel previews using Render and Neon development services; Git-revert rollback | Define and test cookie, CSRF, and browser-session integration during implementation before release; revisit the stack only when a measured requirement challenges it. |
| Background processing | Queued | pg-boss; separate worker service; at-least-once idempotent jobs | Retry timings, retention, dead-letter operations, reconciliation schedules, and monitoring. |
| Notifications | Queued | Expo Push Service; Account-owned device endpoints; durable delivery jobs | Permission prompt, notification catalog, user preferences, badges, sounds, and operational visibility. |
| Uploaded images | Queued | Cloudflare R2; direct signed uploads; backend finalization; private and public namespaces | Signed-URL lifetime, dimensions and byte limits, transformations, content and malware checks, retention, deletion, and public delivery. |
| Hosting and delivery | Partly covered | One immutable backend image run with separate API, worker, and migration commands; Northflank production API and worker; Aiven production PostgreSQL; R2 backups; GitHub Actions; local and disposable CI PostgreSQL; Render development API with Neon development PostgreSQL; immediate protected Vercel previews; Vercel admin web production deployed as validated prebuilt output from GitHub Actions with Git-revert rollback; EAS Build and EAS Submit for manual mobile store releases; controlled EAS Updates | Define production migration sequencing and provider configuration. |
| Operations and security | Queued | Daily logical database backup and portable provider boundaries | Secrets, health and readiness checks, logs, metrics, tracing, error reporting, alerts, restore drills, recovery objectives, and incident runbooks. |
| Testing architecture | Queued | CI quality gates and required unit, integration, contract, architecture, and end-to-end layers; Jest, Nest testing utilities, Supertest, and Testcontainers for backend; Jest, React Native Testing Library, and Maestro for mobile; Jest, React Testing Library, MSW, and Playwright for admin web | Select fixture and database-isolation strategy, automate OpenAPI compatibility and architecture boundaries, and define wider client test boundaries and final critical end-to-end journeys. |
| Data governance | Queued | Sensitive notification and object-access constraints | Retention and deletion policies, Account closure, receipt and Evaluation data handling, audit retention, and any export requirements. |

## Ordered work queue

Work down this list unless the current decision exposes a dependency that must be resolved first:

1. Complete the backend implementation stack and shared-package conventions before scaffolding the backend.
2. Return to the remaining identity, Authentication Session, authorization, and audit policies.
3. Specify transactional and concurrency rules for Booking creation and Subscription allowance consumption, Session capacity, Waitlist promotion, Payment confirmation, Credit application, and Referral rewards.
4. Set time, timezone, scheduling, idempotency, pagination, and caching conventions shared by the API and jobs.
5. Complete background-job, notification, uploaded-image, deployment, observability, backup, rollback, and incident-response policies.
6. Complete the test architecture and personal-data lifecycle rules before handling real user data.

## Update rule

After an architecture decision is accepted:

1. Update the owning ADR or `CONTEXT.md` immediately.
2. Update this roadmap's current-focus checklist or coverage status in the same logical change.
3. Validate links and formatting.
4. Commit the decision atomically using the project `commit` skill.

Only one branch should be marked **In progress**. This keeps the interview focused and makes the next unresolved decision visible without reconstructing the conversation.
