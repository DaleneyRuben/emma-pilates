# Treat the API as a first-party application interface

Status: accepted

The backend API is designed for the studio's role-routed mobile app and admin web app only. It is not a public developer API and does not promise a general-purpose representation of every domain entity.

Endpoints may be shaped around first-party workflows and screen projections, provided commands still enter through the module that owns the behavior. For example, booking a Session is an explicit application operation rather than generic CRUD over Booking and Subscription rows, and an admin report may return a purpose-built projection instead of exposing persistence models.

First-party does not mean undocumented or coupled to backend internals. The API has an explicit machine-readable contract, authenticates every request, and follows the two-mobile-release compatibility policy in [ADR-0016](./0016-support-current-and-previous-mobile-releases.md). Client applications consume transport DTOs rather than Prisma models or domain entities.

Future integrations such as a payment processor are outbound infrastructure adapters owned by the backend and do not require opening this API. If accounting software, partner studios, or third-party developers later need inbound access, they receive a separately designed integration API and credential model rather than inheriting endpoints optimized for our screens.

Designing a public API now was rejected because no external consumer exists and its long-term compatibility, credential, quota, and support commitments would constrain internal product evolution without current benefit.
