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

**System identity, authentication, and authorization** is the active architecture branch. [ADR-0029](../adr/0029-manage-authentication-in-the-nestjs-backend.md) assigns authentication to the NestJS backend, [ADR-0030](../adr/0030-use-opaque-server-side-authentication-sessions.md) records the Authentication Session model and its accepted policies, and [ADR-0031](../adr/0031-use-sendpulse-for-transactional-email.md) selects the managed transactional-email boundary used by this branch.

Resolved within this branch:

- [x] Separate the system Account from Client and Staff Member identities.
- [x] Manage credentials and recovery in the NestJS system-identity module.
- [x] Require one unique email login identifier for every Account; phone numbers remain contact data rather than login identifiers.
- [x] Require self-registered Clients to open a single-use email-verification link before normal access; verification does not sign them in automatically.
- [x] Activate Assistant-created Client and Administrator-created Staff Member Accounts through a single-use email link that verifies the address and lets the recipient create the first password; staff never handle passwords.
- [x] Return recipients to Login after successful activation instead of creating an Authentication Session automatically.
- [x] Recover passwords through a single-use email reset link for every Account; SMS, WhatsApp, and staff assistance are not normal recovery channels.
- [x] Expire self-registration verification links after 24 hours, staff-created Account activation links after 7 days, and password-recovery links after 30 minutes.
- [x] Invalidate every older unused link of the same purpose when issuing a replacement; only the newest link remains valid with a fresh full lifetime.
- [x] Allow an unverified email address to be corrected while an Account is pending; preserve the Account, invalidate links sent to the old address, and send a fresh link to the corrected address. This does not apply after activation.
- [x] Reuse the existing pending Account and domain identity when the same email repeats the same account-creation request; rotate the link instead of creating a duplicate, keep public responses neutral, and identify the pending record to authorized staff.
- [x] Keep the existing pending identity and provisioning path when the same email crosses creation flows; reuse compatible pending Clients without overwriting them, and leave incompatible Client/Staff Member conflicts untouched for authorized staff to resolve.
- [x] Allow authorized cancellation before verification or activation; revoke every outstanding link, release the email, remove the pending identity from active use, and retain only who cancelled it and when.
- [x] Automatically clean up inactive self-registered Accounts after 7 days and inactive staff-created Accounts after 30 days; successful corrections, updates, or link replacements restart the applicable inactivity window.
- [x] Send transactional email through SendPulse behind a project-owned provider interface.
- [x] Use opaque server-side Authentication Sessions.
- [x] Store mobile credentials in operating-system secure storage and admin-web credentials in secure `HttpOnly` cookies.
- [x] Expire mobile sessions after 30 idle days or 90 total days.
- [x] Expire admin-web sessions after 30 idle minutes or 12 total hours.
- [x] Allow multiple concurrent sessions without a product-level device cap in the first release.
- [x] Provide a **Log out all other devices** action that keeps the current session active and revokes every other session across mobile and admin web.
- [x] Revoke all old sessions after password recovery and create one replacement session on the device completing the reset.
- [x] Keep the current session and revoke all other sessions after a normal password change.
- [x] Revoke all sessions immediately when an Account is disabled; re-enabling requires a new login.
- [x] Protect login with PostgreSQL-backed progressive temporary backoff based on claimed-email and request-origin activity; never hard-lock the whole Account or require CAPTCHA in the first release.
- [x] Allow five Login failures without an enforced delay, then wait 30 seconds, 1 minute, 5 minutes, and finally 15 minutes for the ninth and later failures; requests during a wait neither verify nor extend it.
- [x] Reset an email-and-origin Login failure lane after a successful Login or one hour without another failed password verification; throttled requests do not restart that clock.
- [x] Combine an opaque random first-party mobile-installation or browser identifier with trusted network information for broader Login throttling; do not use hardware fingerprinting or permit a missing identifier to bypass the network limit.
- [x] Limit actual failed password checks to 20 per client identifier and 100 per network address in a rolling 15-minute window; pre-verification rejections do not count or extend the window.
- [x] Layer authentication-email limits by recipient and purpose, first-party client identifier, and trusted network; suppressed requests send nothing and preserve the currently valid link, while public recipient-specific suppression remains neutral.

Next decisions in this branch, in order:

- [ ] Complete authentication abuse controls: exact authentication-email cooldowns and rolling budgets, plus remaining account-enumeration behavior.
- [ ] Decide whether Administrators require multi-factor authentication.
- [ ] Record the Role and Branch authorization matrix and where each rule is enforced.
- [ ] Define security audit events and who may inspect them.
- [ ] Design future Administrator-to-Staff-Member impersonation, including actor preservation, duration, restrictions, and auditing. This remains deferred until the initial identity policies are complete.

## Coverage map

| Area | Status | Accepted foundation | Remaining architecture work |
| --- | --- | --- | --- |
| Domain language and boundaries | Covered, ongoing | Context Map; Booking & Membership and Back Office glossaries; Booking ADRs | Keep glossaries and context ADRs current as new rules crystallize. |
| Application surfaces | Covered | One role-routed Expo mobile app, separate admin web, urgent Administrator work split across surfaces | Revisit only if a new workflow challenges the urgent-mobile versus deliberate-desktop boundary. |
| Backend structure | Covered | TypeScript pnpm monorepo; NestJS modular monolith; context-owned module interfaces | Specify architecture tests when the backend is scaffolded. |
| Persistence | Covered | PostgreSQL schemas per context; Prisma behind context-owned repositories; explicit migrations | Select transaction isolation, database constraints, and bounded-retry behavior for concurrency-sensitive workflows. |
| API contract | Covered | First-party REST; NestJS code-first OpenAPI; `/api/v1`; current and previous mobile releases; RFC 9457 errors | Define pagination, filtering, idempotency, authorization, and caching conventions as the first endpoints are designed. |
| Identity and access | In progress | Account boundary; backend-managed authentication; opaque Authentication Sessions; SendPulse behind a project-owned email-delivery interface | Complete the active checklist above. |
| Mobile architecture | Queued | Expo with React Native; generated REST client; Expo Push Service | Navigation, server and local state, offline policy, local persistence, deep links, EAS builds, over-the-air updates, and test tools. |
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

1. Finish identity, Authentication Session, authorization, and audit policies.
2. Specify transactional and concurrency rules for Booking creation and Subscription allowance consumption, Session capacity, Waitlist promotion, Payment confirmation, Credit application, and Referral rewards.
3. Set time, timezone, scheduling, idempotency, pagination, and caching conventions shared by the API and jobs.
4. Complete the mobile architecture immediately before scaffolding the mobile app.
5. Complete the admin-web architecture immediately before scaffolding the admin web app.
6. Complete background-job, notification, and uploaded-image operating policies.
7. Complete deployment, observability, backup restoration, rollback, and incident-response documentation before production use.
8. Complete the test architecture and personal-data lifecycle rules before handling real user data.

## Update rule

After an architecture decision is accepted:

1. Update the owning ADR or `CONTEXT.md` immediately.
2. Update this roadmap's current-focus checklist or coverage status in the same logical change.
3. Validate links and formatting.
4. Commit the decision atomically using the project `commit` skill.

Only one branch should be marked **In progress**. This keeps the interview focused and makes the next unresolved decision visible without reconstructing the conversation.
