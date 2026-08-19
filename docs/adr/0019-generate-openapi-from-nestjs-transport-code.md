# Generate OpenAPI from NestJS transport code

Status: accepted

NestJS controllers and transport DTOs are the source of truth for the REST API. The backend generates an OpenAPI document from that code using the NestJS OpenAPI integration. Mobile and admin clients are generated from the resulting document; they never import backend source types directly.

Transport DTOs live at each bounded context's inbound HTTP boundary. They describe request and response messages and carry the metadata needed for OpenAPI generation and runtime validation. They are not Prisma models or domain entities, and controllers map between DTOs and application use cases explicitly.

The generated OpenAPI document is a reviewed build artifact. Continuous integration regenerates it and fails when the working tree artifact is stale. It also compares the new document against the contracts used by the current and previous supported mobile releases and blocks incompatible removals, type changes, newly required inputs, and other breaking changes under [ADR-0016](./0016-support-current-and-previous-mobile-releases.md).

Generated TypeScript clients and their transport types live in the `api-contracts` workspace package established in [ADR-0013](./0013-use-a-pnpm-monorepo.md). Generation is one-way: client applications consume the generated package, but backend domain or application modules do not depend on it.

A hand-authored OpenAPI-first workflow was rejected because one team owns the backend and both clients, and maintaining generated server interfaces alongside NestJS controllers would add coordination work without an independent API-design team. Validation-schema-first generation was rejected because it would require a less native integration layer to make an additional schema system the center of the NestJS transport boundary.
