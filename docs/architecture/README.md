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

**Background-processing reliability** is the active architecture branch. The API reliability and collection-conventions branch is now covered by [ADR-0060](../adr/0060-require-idempotency-keys-for-retry-sensitive-commands.md), [ADR-0061](../adr/0061-use-contextual-pagination-styles.md), [ADR-0062](../adr/0062-allowlist-collection-filters-and-sorts.md), and [ADR-0063](../adr/0063-use-private-conditional-http-caching.md). Background work uses the durable, at-least-once pg-boss foundation in [ADR-0024](../adr/0024-use-pg-boss-for-durable-background-jobs.md), the recoverable reconciler pattern in [ADR-0058](../adr/0058-reconcile-due-work-into-pg-boss.md), and the bounded job-family retry presets in [ADR-0064](../adr/0064-use-bounded-retry-policies-by-job-family.md). The next decision will set how exhausted and permanently failed jobs are retained and recovered.

Architecture decisions completed before this branch:

- [x] Keep Account credentials and Authentication Sessions separate from Client and Staff Member domain identities.
- [x] Manage email-only authentication, verification, activation, and password recovery in the NestJS backend.
- [x] Use independently revocable opaque Authentication Sessions with surface-specific idle and absolute lifetimes.
- [x] Send transactional authentication email through a project-owned interface backed initially by SendPulse.
- [x] Commit authentication state and encrypted pg-boss email jobs together, then deliver asynchronously after rechecking that the link is still current.
- [x] Limit SendPulse attempts to ten seconds and retry eligible authentication-email failures three times with bounded backoff over about ten minutes.
- [x] Keep public delivery status neutral while authorized staff can inspect sanitized pending-invitation status and manage hard-bounce or complaint suppression.
- [x] Return one neutral Login failure for unknown, incorrect, pending, unverified, inactive, and disabled Accounts with equivalent password work and throttling behavior.
- [x] Require every Administrator to enroll TOTP with one-time recovery codes through a 15-minute restricted challenge at first successful password login before receiving a full Authentication Session.
- [x] Issue ten single-use Administrator recovery codes, warn when three remain, and replace every remaining code when a new set is generated.
- [x] Require the current password and existing TOTP or recovery code to replace an Administrator factor, then rotate recovery codes and revoke every other Authentication Session.
- [x] Recover an Administrator who has lost every factor through the current password and a single-use link sent to the verified email address.
- [x] Enforce fixed Roles plus resource ownership, operational relationship, and Branch scope in backend use cases with default-deny tests.
- [x] Store focused, append-only audit records for sensitive security, financial, and administrative events in the same PostgreSQL transaction as successful changes.
- [x] Use selective Serializable transactions with bounded retries and database constraints for allocation and money-related workflows.
- [x] Use Bolivia civil time for every Branch and application surface, with timezone-aware instants for storage and transport.
- [x] Reconcile due database state periodically into idempotent pg-boss jobs that recheck authoritative state before acting.
- [x] Materialize weekly Session Schedules and Availability Blocks into concrete occurrences inside the future booking window.
- [x] Require Account-scoped idempotency keys for client commands whose retry could duplicate a business effect.
- [x] Use cursor pagination for changing mobile collections and page-and-offset pagination for bounded admin tables, with one style per endpoint.
- [x] Expose only endpoint-specific, typed, allowlisted filters and sort choices.
- [x] Use TanStack Query for presentation caching, private conditional HTTP caching for suitable reads, and `no-store` for sensitive responses.
- [x] Use bounded retry and execution-timeout presets selected by job family and failure mode.

Next decisions in this branch, in order:

- [ ] Define failed-job retention, inspection, and recovery.
- [ ] Define background-worker monitoring and alerts.

Deferred identity work:

- [ ] Design Administrator-to-Staff-Member mobile impersonation when that future feature is prioritized.

Deferred pre-release requirement from the covered admin-web branch:

- [ ] Define and test cookie, CSRF, CORS or same-origin proxying, and browser-session integration using the actual admin-web and API origins. Do not ship the admin web before this security boundary is resolved.

## Coverage map

| Area | Status | Accepted foundation | Remaining architecture work |
| --- | --- | --- | --- |
| Domain language and boundaries | Covered, ongoing | Context Map; Booking & Membership and Back Office glossaries; Booking ADRs | Keep glossaries and context ADRs current as new rules crystallize. |
| Application surfaces | Covered | One role-routed Expo mobile app, separate admin web, urgent Administrator work split across surfaces | Revisit only if a new workflow challenges the urgent-mobile versus deliberate-desktop boundary. |
| Backend structure | Covered | TypeScript pnpm monorepo with plain pnpm task orchestration, one-way public-package dependencies, ESLint import restrictions, and Jest architecture tests; NestJS modular monolith; context-owned module interfaces; one backend image with separate API, pg-boss worker, and migration commands; Jest, Nest testing utilities, Supertest, and disposable PostgreSQL through Testcontainers; Orval-generated API contracts; fail-fast typed configuration with Nest Config and Zod | Revisit only if measured build performance or boundary complexity outgrows the initial conventions. |
| Persistence | Covered | PostgreSQL schemas per context; Prisma behind context-owned repositories; explicit migrations; selective Serializable transactions with bounded retries and database constraints for critical workflows | Confirm each workflow's exact constraints and transaction boundary during schema design before its migration is approved. |
| API contract | Covered | First-party REST; NestJS code-first OpenAPI; `/api/v1`; current and previous mobile releases; RFC 9457 errors; committed Orval-generated Fetch and TanStack Query client; Account-scoped idempotency keys with replayed outcomes for retry-sensitive commands; contextual pagination; endpoint-specific allowlisted filters and sorts; private conditional caching with sensitive-response opt-out | Automate breaking-change comparison as part of implementation. |
| Time and scheduling | Covered | Domain-defined Session times, Cancellation Window, expirations, and delayed work; one `America/La_Paz` business zone with timezone-aware stored instants and UTC API transport; database-clock reconcilers dispatching idempotent pg-boss jobs; recurring definitions materialized into concrete occurrences | Set the future booking window and recurring-edit behavior with the scheduling product rules. |
| Identity and access | Covered | Account boundary; backend-managed authentication with neutral enumeration-resistant public flows; opaque Authentication Sessions; transactionally queued encrypted authentication email through SendPulse with bounded retries, neutral public status, and authorized pending-invitation visibility; accepted session and initial abuse-control policies; mandatory first-login Administrator TOTP, recovery codes, secure factor replacement, and password-plus-email emergency recovery; fixed Roles with use-case-owned contextual authorization; focused append-only audit records | Administrator-to-Staff-Member mobile impersonation remains explicitly deferred. |
| Mobile architecture | Covered | Expo with React Native; generated REST client; Expo Push Service; React Navigation static configuration; TanStack Query; React Hook Form with Zod; local React state and narrow Context; online-first read-only cache in AsyncStorage; credentials in SecureStore; verified HTTPS links through one authenticated ingress; Jest, React Native Testing Library, and Maestro; manual EAS Build and EAS Submit store releases after CI; controlled EAS Updates for small compatible fixes | Set cache lifetime and storage limits during implementation; revisit only when a native or product requirement challenges the accepted boundaries. |
| Admin-web architecture | Covered | Vite, React, and TanStack Router; static SPA; project-owned shadcn/ui components with Tailwind design tokens and Radix behavior; TanStack Table; React Hook Form with Zod; TanStack Query with local React state and narrow Context; Jest, React Testing Library, MSW, and Playwright; GitHub Actions production deployments to Vercel; immediate protected Vercel previews using Render and Neon development services; Git-revert rollback | Define and test cookie, CSRF, and browser-session integration during implementation before release; revisit the stack only when a measured requirement challenges it. |
| Background processing | In progress | pg-boss; separate worker service; at-least-once idempotent jobs; recurring database-state reconcilers for recoverable due work; bounded retry and execution-timeout presets by job family | Retention, dead-letter operations, per-family reconciliation intervals, and monitoring. |
| Notifications | Queued | Expo Push Service; Account-owned device endpoints; durable delivery jobs | Permission prompt, notification catalog, user preferences, badges, sounds, and operational visibility. |
| Uploaded images | Queued | Cloudflare R2; direct signed uploads; backend finalization; private and public namespaces | Signed-URL lifetime, dimensions and byte limits, transformations, content and malware checks, retention, deletion, and public delivery. |
| Hosting and delivery | Partly covered | One immutable backend image run with separate API, worker, and migration commands; Northflank production API and worker; Aiven production PostgreSQL; R2 backups; GitHub Actions; local and disposable CI PostgreSQL; Render development API with Neon development PostgreSQL; immediate protected Vercel previews; Vercel admin web production deployed as validated prebuilt output from GitHub Actions with Git-revert rollback; EAS Build and EAS Submit for manual mobile store releases; controlled EAS Updates | Define production migration sequencing and provider configuration. |
| Operations and security | Queued | Daily logical database backup; portable provider boundaries; focused append-only PostgreSQL audit records for sensitive events | Secrets, health and readiness checks, logs, metrics, tracing, error reporting, alerts, audit retention, restore drills, recovery objectives, and incident runbooks. |
| Testing architecture | Queued | CI quality gates and required unit, integration, contract, architecture, and end-to-end layers; Jest, Nest testing utilities, Supertest, and Testcontainers for backend; Jest, React Native Testing Library, and Maestro for mobile; Jest, React Testing Library, MSW, and Playwright for admin web | Select fixture and database-isolation strategy, automate OpenAPI compatibility and architecture boundaries, and define wider client test boundaries and final critical end-to-end journeys. |
| Data governance | Queued | Sensitive notification and object-access constraints | Retention and deletion policies, Account closure, receipt and Evaluation data handling, audit retention, and any export requirements. |

## Ordered work queue

Work down this list unless the current decision exposes a dependency that must be resolved first:

1. Complete background-job, notification, uploaded-image, deployment, observability, backup, rollback, and incident-response policies.
2. Complete the test architecture and personal-data lifecycle rules before handling real user data.

## Update rule

After an architecture decision is accepted:

1. Update the owning ADR or `CONTEXT.md` immediately.
2. Update this roadmap's current-focus checklist or coverage status in the same logical change.
3. Validate links and formatting.
4. Commit the decision atomically using the project `commit` skill.

Only one branch should be marked **In progress**. This keeps the interview focused and makes the next unresolved decision visible without reconstructing the conversation.
