# Use TanStack Query for mobile server state

Status: accepted

The Expo mobile application will use TanStack Query to fetch, cache, refresh, and mutate backend-owned data. Query functions call the generated TypeScript client from the `api-contracts` package, which remains responsible for the REST transport and contract types; TanStack Query owns the mobile cache and request lifecycle rather than redefining the API contract.

This separation fits an application whose Sessions, Bookings, Waitlist positions, Subscriptions, Payments, and profiles are authoritative on the backend. Returning to a screen may show suitable cached data while refreshing it, and successful mutations invalidate or update the precise related queries. Concurrency-sensitive operations such as creating a Booking or confirming a Payment must wait for the server result and must not present optimistic success that the backend could reject.

Redux Toolkit with RTK Query was considered and can provide comparable user-facing behavior. It was rejected because the mobile application has no established need for Redux as a global client-state architecture, while adopting RTK Query would introduce its store and middleware conventions alongside the already generated REST client. Handwritten fetching hooks were rejected because they would require the project to recreate cache lifetimes, request deduplication, retries, invalidation, and background refresh behavior.

The mobile integration must connect TanStack Query's focus and network managers to React Native application and connectivity state. This decision does not select a local client-state library, persisted query cache, offline mutation queue, cache lifetimes, retry policy, or the admin web's server-state library; those remain separate decisions.
