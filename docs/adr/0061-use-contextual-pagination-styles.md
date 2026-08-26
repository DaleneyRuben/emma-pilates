# Use contextual pagination styles

Status: accepted

Each collection endpoint uses exactly one pagination style chosen for its use case. Changing, ordered collections intended for mobile scrolling use cursor pagination; examples include schedules, Booking history, notifications, and Payment activity. Bounded administrative tables where users need page numbers and totals use page-and-offset pagination. Cursor pagination is an API mechanism and may support either infinite scrolling or an explicit "Load more" interaction in the client.

Cursor requests use an opaque cursor and a limit, and responses return the items, an optional next cursor, and whether more results exist. The cursor represents the endpoint's deterministic sort position, including a unique identifier as a tie-breaker; cursor collections do not calculate a total count by default. Page requests use a one-based page and page size, and responses also return total items and total pages. Exact field names, default sizes, and maximum sizes will be defined consistently in the shared API contract during implementation.

Filters and sorting are applied before pagination, and every allowed ordering has a unique identifier as its final tie-breaker. If mobile and admin need different navigation over related data, they receive separate task-focused endpoints or projections backed by shared internal query logic. An endpoint never switches pagination behavior based on whether cursor or page parameters happen to be present. NestJS code-first OpenAPI documents the chosen request and response shape, and Orval generates the matching typed client.

Cursor pagination everywhere was rejected because it makes page jumping and exact totals awkward in bounded administrative workflows. Offset pagination everywhere was rejected because users can see duplicates or miss records while moving through frequently changing mobile collections.
