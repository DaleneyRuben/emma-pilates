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

**Admin-web architecture and stack** is the active architecture branch. [ADR-0023](../adr/0023-use-vite-react-and-tanstack-router-for-admin-web.md) selects Vite, React, TanStack Router, and a static single-page application, [ADR-0040](../adr/0040-build-admin-components-with-shadcn-tailwind-and-radix.md) selects the project-owned component and design-system implementation, [ADR-0041](../adr/0041-use-react-hook-form-and-zod-for-admin-forms.md) selects form state and runtime validation, [ADR-0042](../adr/0042-use-tanstack-query-and-local-react-state-for-admin-state.md) defines server-state and local-state ownership, [ADR-0043](../adr/0043-use-jest-testing-library-msw-and-playwright-for-admin-tests.md) selects the admin-web test tools, [ADR-0044](../adr/0044-deploy-the-admin-web-to-vercel-through-github-actions.md) selects Vercel hosting with GitHub Actions validation and deployment, [ADR-0045](../adr/0045-maintain-a-shared-development-api-and-database.md) isolates previews behind a shared development API and database, and [ADR-0046](../adr/0046-host-shared-development-on-render-and-neon.md) selects Render and Neon as its initial free providers. The mobile architecture branch is covered by [ADR-0022](../adr/0022-use-expo-with-react-native-for-the-mobile-app.md) and its linked decisions, including manual EAS store releases in [ADR-0038](../adr/0038-use-eas-build-and-submit-for-manual-mobile-releases.md) and controlled over-the-air fixes in [ADR-0039](../adr/0039-use-controlled-eas-updates-for-small-mobile-fixes.md).

Resolved within this branch:

- [x] Use Vite and React for a static TypeScript single-page application.
- [x] Use TanStack Router for typed routes and validated URL search state.
- [x] Build project-owned components from shadcn/ui's Radix-based components and Tailwind design tokens; use TanStack Table for data-table behavior.
- [x] Use React Hook Form with Zod runtime schemas for admin-web forms.
- [x] Use TanStack Query for server state, local React state for temporary UI state, and narrow Context only for low-frequency application-wide state; do not add Redux or Zustand initially.
- [x] Use Jest, React Testing Library, MSW, and Playwright for admin-web tests.
- [x] Host the static admin web on Vercel and deploy prebuilt production output through GitHub Actions only after required checks pass.
- [x] Point Vercel previews to one isolated shared development API and PostgreSQL database; keep local, CI, development, and production data environments separate.
- [x] Host the shared development API on Render Free and its PostgreSQL database on Neon Free, without a continuously active development worker.

Next decisions in this branch, in order:

- [ ] Define preview-deployment triggers and access control.
- [ ] Define production-rollback behavior.

Deferred until implementation:

- [ ] Define and test cookie, CSRF, CORS or same-origin proxying, and browser-session integration using the actual admin-web and API origins. Do not ship the admin web before this security boundary is resolved.

## Coverage map

| Area | Status | Accepted foundation | Remaining architecture work |
| --- | --- | --- | --- |
| Domain language and boundaries | Covered, ongoing | Context Map; Booking & Membership and Back Office glossaries; Booking ADRs | Keep glossaries and context ADRs current as new rules crystallize. |
| Application surfaces | Covered | One role-routed Expo mobile app, separate admin web, urgent Administrator work split across surfaces | Revisit only if a new workflow challenges the urgent-mobile versus deliberate-desktop boundary. |
| Backend structure | Covered | TypeScript pnpm monorepo; NestJS modular monolith; context-owned module interfaces | Specify architecture tests when the backend is scaffolded. |
| Persistence | Covered | PostgreSQL schemas per context; Prisma behind context-owned repositories; explicit migrations | Select transaction isolation, database constraints, and bounded-retry behavior for concurrency-sensitive workflows. |
| API contract | Covered | First-party REST; NestJS code-first OpenAPI; `/api/v1`; current and previous mobile releases; RFC 9457 errors | Define pagination, filtering, idempotency, authorization, and caching conventions as the first endpoints are designed. |
| Identity and access | Queued | Account boundary; backend-managed authentication; opaque Authentication Sessions; SendPulse behind a project-owned email-delivery interface; accepted session and initial abuse-control policies | Complete authentication-email client/network budgets, account-enumeration behavior, Administrator MFA, authorization matrix, audit events, and deferred impersonation design after stack definition. |
| Mobile architecture | Covered | Expo with React Native; generated REST client; Expo Push Service; React Navigation static configuration; TanStack Query; React Hook Form with Zod; local React state and narrow Context; online-first read-only cache in AsyncStorage; credentials in SecureStore; verified HTTPS links through one authenticated ingress; Jest, React Native Testing Library, and Maestro; manual EAS Build and EAS Submit store releases after CI; controlled EAS Updates for small compatible fixes | Set cache lifetime and storage limits during implementation; revisit only when a native or product requirement challenges the accepted boundaries. |
| Admin-web architecture | In progress | Vite, React, and TanStack Router; static SPA; project-owned shadcn/ui components with Tailwind design tokens and Radix behavior; TanStack Table; React Hook Form with Zod; TanStack Query with local React state and narrow Context; Jest, React Testing Library, MSW, and Playwright; Vercel production deployments through GitHub Actions; Render development API and Neon development PostgreSQL for previews | Define preview triggers, access, and rollback behavior; define and test cookie, CSRF, and browser-session integration during implementation before release. |
| Background processing | Queued | pg-boss; separate worker service; at-least-once idempotent jobs | Retry timings, retention, dead-letter operations, reconciliation schedules, and monitoring. |
| Notifications | Queued | Expo Push Service; Account-owned device endpoints; durable delivery jobs | Permission prompt, notification catalog, user preferences, badges, sounds, and operational visibility. |
| Uploaded images | Queued | Cloudflare R2; direct signed uploads; backend finalization; private and public namespaces | Signed-URL lifetime, dimensions and byte limits, transformations, content and malware checks, retention, deletion, and public delivery. |
| Hosting and delivery | Partly covered | Northflank production API and worker; Aiven production PostgreSQL; R2 backups; GitHub Actions; local and disposable CI PostgreSQL; Render development API with Neon development PostgreSQL; Vercel admin web deployed as validated prebuilt output from GitHub Actions; EAS Build and EAS Submit for manual mobile store releases; controlled EAS Updates | Define admin-web preview access and rollback, production migration sequencing, and provider configuration. |
| Operations and security | Queued | Daily logical database backup and portable provider boundaries | Secrets, health and readiness checks, logs, metrics, tracing, error reporting, alerts, restore drills, recovery objectives, and incident runbooks. |
| Testing architecture | Queued | CI quality gates and required unit, integration, contract, architecture, and end-to-end layers; Jest, React Native Testing Library, and Maestro for mobile; Jest, React Testing Library, MSW, and Playwright for admin web | Select backend tools, fixture strategy, database isolation, wider client test boundaries, and final critical end-to-end journeys. |
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
