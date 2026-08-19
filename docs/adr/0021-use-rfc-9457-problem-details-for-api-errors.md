# Use RFC 9457 Problem Details for API errors

Status: accepted

All versioned REST endpoints return errors using RFC 9457 Problem Details with the `application/problem+json` media type. The standard members are `type`, `title`, `status`, `detail`, and `instance`; an endpoint includes only the members that are meaningful for that response.

Application errors extend the problem document with a stable project-owned `code`. Mobile and admin clients use `code`, rather than `title` or `detail`, for programmatic decisions. Human-readable fields may be reworded or localized without changing client behavior. Error codes form part of the supported API contract and follow the compatibility policy in [ADR-0016](./0016-support-current-and-previous-mobile-releases.md).

Validation failures may additionally include a `violations` array containing machine-readable field paths and violation codes. Responses include a `traceId` when one is available so a reported failure can be correlated with server telemetry. Problem documents never expose stack traces, database details, credentials, or other internal implementation information.

NestJS maps known domain and application failures to problem documents in a centralized transport-layer exception filter. Unexpected failures use a generic problem type and code, while their diagnostic details remain in server-side telemetry. Transport mappings do not make domain errors depend on HTTP or NestJS.

Reusable problem schemas and the error responses that use them are documented in the generated OpenAPI contract. Generated TypeScript clients therefore receive typed problem responses and stable codes through the same contract pipeline selected in [ADR-0019](./0019-generate-openapi-from-nestjs-transport-code.md).

A custom error envelope was rejected because it would create a project-specific convention for a problem already covered by an Internet standard. Returning only HTTP status codes and ad hoc messages was rejected because clients need stable, structured business error handling and validation feedback.
