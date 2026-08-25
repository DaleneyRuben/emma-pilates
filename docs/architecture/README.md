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

**Identity and access** is the active architecture branch. [ADR-0009](../adr/0009-separate-system-account-from-domain-identities.md) separates the system Account from Client and Staff Member identities, [ADR-0029](../adr/0029-manage-authentication-in-the-nestjs-backend.md) establishes backend-managed email authentication and its activation and recovery journeys, [ADR-0030](../adr/0030-use-opaque-server-side-authentication-sessions.md) defines opaque server-side Authentication Sessions, [ADR-0031](../adr/0031-use-sendpulse-for-transactional-email.md) isolates SendPulse behind a project-owned delivery interface, and [ADR-0053](../adr/0053-require-totp-mfa-for-administrators.md) requires TOTP MFA with recovery codes for Administrators. The backend implementation stack and shared-package branch is now covered, including the import and architecture-test enforcement conventions added to [ADR-0013](../adr/0013-use-a-pnpm-monorepo.md).

Resolved within this branch:

- [x] Keep Account credentials and Authentication Sessions separate from Client and Staff Member domain identities.
- [x] Manage email-only authentication, verification, activation, and password recovery in the NestJS backend.
- [x] Use independently revocable opaque Authentication Sessions with surface-specific idle and absolute lifetimes.
- [x] Send transactional authentication email through a project-owned interface backed initially by SendPulse.
- [x] Commit authentication state and encrypted pg-boss email jobs together, then deliver asynchronously after rechecking that the link is still current.
- [x] Limit SendPulse attempts to ten seconds and retry eligible authentication-email failures three times with bounded backoff over about ten minutes.
- [x] Keep public delivery status neutral while authorized staff can inspect sanitized pending-invitation status and manage hard-bounce or complaint suppression.
- [x] Return one neutral Login failure for unknown, incorrect, pending, unverified, inactive, and disabled Accounts with equivalent password work and throttling behavior.
- [x] Require every Administrator to use TOTP authenticator-app codes with one-time recovery codes.

Next decisions in this branch, in order:

- [ ] Define the Administrator MFA enrollment, challenge, recovery-code, and factor-replacement lifecycle.
- [ ] Define the authorization matrix and security audit events.
- [ ] Design the deferred Administrator-to-Staff-Member mobile impersonation feature.

Deferred pre-release requirement from the covered admin-web branch:

- [ ] Define and test cookie, CSRF, CORS or same-origin proxying, and browser-session integration using the actual admin-web and API origins. Do not ship the admin web before this security boundary is resolved.

## Coverage map

| Area | Status | Accepted foundation | Remaining architecture work |
| --- | --- | --- | --- |
| Domain language and boundaries | Covered, ongoing | Context Map; Booking & Membership and Back Office glossaries; Booking ADRs | Keep glossaries and context ADRs current as new rules crystallize. |
| Application surfaces | Covered | One role-routed Expo mobile app, separate admin web, urgent Administrator work split across surfaces | Revisit only if a new workflow challenges the urgent-mobile versus deliberate-desktop boundary. |
| Backend structure | Covered | TypeScript pnpm monorepo with plain pnpm task orchestration, one-way public-package dependencies, ESLint import restrictions, and Jest architecture tests; NestJS modular monolith; context-owned module interfaces; one backend image with separate API, pg-boss worker, and migration commands; Jest, Nest testing utilities, Supertest, and disposable PostgreSQL through Testcontainers; Orval-generated API contracts; fail-fast typed configuration with Nest Config and Zod | Revisit only if measured build performance or boundary complexity outgrows the initial conventions. |
| Persistence | Covered | PostgreSQL schemas per context; Prisma behind context-owned repositories; explicit migrations | Select transaction isolation, database constraints, and bounded-retry behavior for concurrency-sensitive workflows. |
| API contract | Covered | First-party REST; NestJS code-first OpenAPI; `/api/v1`; current and previous mobile releases; RFC 9457 errors; committed Orval-generated Fetch and TanStack Query client | Automate breaking-change comparison; define pagination, filtering, idempotency, authorization, and caching conventions as the first endpoints are designed. |
| Identity and access | In progress | Account boundary; backend-managed authentication with neutral enumeration-resistant public flows; opaque Authentication Sessions; transactionally queued encrypted authentication email through SendPulse with bounded retries, neutral public status, and authorized pending-invitation visibility; accepted session and initial abuse-control policies; mandatory Administrator TOTP with one-time recovery codes | Complete the Administrator MFA lifecycle, authorization matrix, audit events, and deferred impersonation design. |
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
