# Use REST with an OpenAPI contract

Status: accepted

The backend exposes an HTTP REST API described by OpenAPI. The role-routed mobile app and admin web app use generated TypeScript clients built from the published OpenAPI document rather than importing backend controller, domain, or Prisma types.

The API models business capabilities rather than exposing generic CRUD over database tables. Important state changes are explicit operations whose names and request bodies communicate intent, such as booking a Session, joining a Waitlist, rescheduling a Booking, confirming or rejecting a Payment, recording Attendance, and cancelling a Session. Resource-oriented reads return projections shaped for first-party workflows without leaking persistence models.

REST fits the system's known, action-oriented screens and NestJS application shell. Standard HTTP behavior makes authentication, authorization, request tracing, caching, conditional requests, receipt and Promotion image transfer, and operational debugging straightforward. OpenAPI supplies a language-neutral, machine-readable boundary even though all current applications use TypeScript.

The generated client is versioned and compatibility-tested under [ADR-0016](./0016-support-current-and-previous-mobile-releases.md). A backend change must remain compatible with the OpenAPI contracts consumed by both supported mobile releases. Admin web may upgrade in lockstep, but it uses the same documented interface.

GraphQL was rejected because the product has a finite, already-designed set of workflows and does not need clients to compose arbitrary graph projections. Its resolver authorization, query-cost controls, N+1 prevention, cache behavior, and non-standard file-upload handling would add machinery without a corresponding product requirement. tRPC was rejected because its direct TypeScript router coupling provides less durable separation for installed mobile releases and fits NestJS less naturally.

Using more than one application protocol—for example REST commands with GraphQL reads—was also rejected. It would duplicate authentication, errors, observability, client infrastructure, and compatibility policy for benefits this product does not need.
