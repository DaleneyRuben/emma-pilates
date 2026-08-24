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

**Mobile application architecture and stack** is the active architecture branch. [ADR-0022](../adr/0022-use-expo-with-react-native-for-the-mobile-app.md) selects the Expo and React Native foundation, and [ADR-0032](../adr/0032-use-react-navigation-for-mobile-navigation.md) selects explicit React Navigation static configuration for the role-routed native application.

Resolved within this branch:

- [x] Use one Expo and React Native application for Client and Staff Member experiences on iOS and Android.
- [x] Consume the generated TypeScript REST client from the `api-contracts` workspace package.
- [x] Use Expo Push Service through a backend-owned notification boundary.
- [x] Use React Navigation static configuration with explicit role-specific route trees.

Next decisions in this branch, in order:

- [ ] Select the server-state and generated-API-client integration.
- [ ] Select form state and runtime validation.
- [ ] Decide what local client state exists outside server state and navigation.
- [ ] Define offline behavior and local persistence, including what sensitive data may be stored.
- [ ] Define deep-link ownership and authentication gating for notifications and application links.
- [ ] Select mobile test tools and boundaries.
- [ ] Decide the EAS build, store release, and over-the-air update policy.

## Coverage map

| Area | Status | Accepted foundation | Remaining architecture work |
| --- | --- | --- | --- |
| Domain language and boundaries | Covered, ongoing | Context Map; Booking & Membership and Back Office glossaries; Booking ADRs | Keep glossaries and context ADRs current as new rules crystallize. |
| Application surfaces | Covered | One role-routed Expo mobile app, separate admin web, urgent Administrator work split across surfaces | Revisit only if a new workflow challenges the urgent-mobile versus deliberate-desktop boundary. |
| Backend structure | Covered | TypeScript pnpm monorepo; NestJS modular monolith; context-owned module interfaces | Specify architecture tests when the backend is scaffolded. |
| Persistence | Covered | PostgreSQL schemas per context; Prisma behind context-owned repositories; explicit migrations | Select transaction isolation, database constraints, and bounded-retry behavior for concurrency-sensitive workflows. |
| API contract | Covered | First-party REST; NestJS code-first OpenAPI; `/api/v1`; current and previous mobile releases; RFC 9457 errors | Define pagination, filtering, idempotency, authorization, and caching conventions as the first endpoints are designed. |
| Identity and access | Queued | Account boundary; backend-managed authentication; opaque Authentication Sessions; SendPulse behind a project-owned email-delivery interface; accepted session and initial abuse-control policies | Complete authentication-email client/network budgets, account-enumeration behavior, Administrator MFA, authorization matrix, audit events, and deferred impersonation design after stack definition. |
| Mobile architecture | In progress | Expo with React Native; generated REST client; Expo Push Service; React Navigation static configuration | Server and local state, forms and runtime validation, offline policy, local persistence, deep links, EAS builds, over-the-air updates, and test tools. |
| Admin-web architecture | Queued | Vite, React, and TanStack Router; static SPA | Component-system implementation, forms and runtime validation, server-state caching, local state, test tools, cookie/CSRF integration, and Vercel hosting documentation. |
| Background processing | Queued | pg-boss; separate worker service; at-least-once idempotent jobs | Retry timings, retention, dead-letter operations, reconciliation schedules, and monitoring. |
| Notifications | Queued | Expo Push Service; Account-owned device endpoints; durable delivery jobs | Permission prompt, notification catalog, user preferences, badges, sounds, and operational visibility. |
| Uploaded images | Queued | Cloudflare R2; direct signed uploads; backend finalization; private and public namespaces | Signed-URL lifetime, dimensions and byte limits, transformations, content and malware checks, retention, deletion, and public delivery. |
| Hosting and delivery | Partly covered | Northflank API and worker; Aiven PostgreSQL; R2 backups; GitHub Actions; disposable CI PostgreSQL; no permanent staging | Document admin-web hosting, mobile build and store release, production deployment and rollback, migration sequencing, and provider configuration. |
| Operations and security | Queued | Daily logical database backup and portable provider boundaries | Secrets, health and readiness checks, logs, metrics, tracing, error reporting, alerts, restore drills, recovery objectives, and incident runbooks. |
| Testing architecture | Queued | CI quality gates and required unit, integration, contract, architecture, and end-to-end layers | Select concrete tools, fixture strategy, database isolation, client test boundaries, and critical end-to-end journeys. |
| Data governance | Queued | Sensitive notification and object-access constraints | Retention and deletion policies, Account closure, receipt and Evaluation data handling, audit retention, and any export requirements. |

## Ordered work queue

Work down this list unless the current decision exposes a dependency that must be resolved first:

1. Complete the mobile architecture and stack before scaffolding the mobile app.
2. Complete the admin-web architecture and stack before scaffolding the admin web app.
3. Complete the backend implementation stack and shared-package conventions before scaffolding the backend.
4. Return to the remaining identity, Authentication Session, authorization, and audit policies.
5. Specify transactional and concurrency rules for Booking creation and Subscription allowance consumption, Session capacity, Waitlist promotion, Payment confirmation, Credit application, and Referral rewards.
6. Set time, timezone, scheduling, idempotency, pagination, and caching conventions shared by the API and jobs.
7. Complete background-job, notification, uploaded-image, deployment, observability, backup, rollback, and incident-response policies.
8. Complete the test architecture and personal-data lifecycle rules before handling real user data.

## Update rule

After an architecture decision is accepted:

1. Update the owning ADR or `CONTEXT.md` immediately.
2. Update this roadmap's current-focus checklist or coverage status in the same logical change.
3. Validate links and formatting.
4. Commit the decision atomically using the project `commit` skill.

Only one branch should be marked **In progress**. This keeps the interview focused and makes the next unresolved decision visible without reconstructing the conversation.
