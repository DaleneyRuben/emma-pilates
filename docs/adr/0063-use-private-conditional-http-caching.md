# Use private conditional HTTP caching

Status: accepted

TanStack Query is the mobile and admin web presentation cache and owns loading, refetching, and mutation-driven invalidation. The authenticated REST API does not permit shared intermediary caching. Cacheable authenticated GET responses are marked private and require revalidation; stable read endpoints may return an `ETag` so a client can send `If-None-Match` and receive `304 Not Modified` when its representation is still current. Each validator is scoped to the complete authorized representation, including relevant query parameters, so it cannot cross an Account or permission boundary.

Authentication and session responses, security challenges, recovery or activation flows, upload credentials, and other responses containing secrets or particularly sensitive data use `Cache-Control: no-store`. Mutation responses also use `no-store` by default. Dynamic business data such as Booking availability is not given a fixed HTTP freshness lifetime initially; TanStack Query may show its local data while revalidating according to use-case-specific settings chosen during implementation. Public versioned static assets are outside this authenticated API policy and may use long-lived immutable caching.

Disabling all caching was rejected because it would resend unchanged stable representations and would not improve how the clients manage already-loaded screen data. Giving every GET a fixed cache lifetime was rejected because Bookings, capacity, Payments, and administrative state can change during that lifetime. Shared caching was rejected because both first-party surfaces primarily consume Account-specific, authorization-dependent representations.
