# Build a modular monolith decomposed by bounded context

Status: accepted

The system ships as a single deployable with Booking & Membership and Back Office as enforced top-level modules, mirroring the contexts already documented in [CONTEXT-MAP.md](../../CONTEXT-MAP.md). The module boundary is real and checked, not a naming convention.

The case against splitting into services is transactional rather than about scale. Creating a Booking must atomically consume one unit of a Subscription's allowance, and waitlist promotion must check a candidate's eligibility and create their Booking without a concurrent cancellation promoting the same person twice or handing two clients one spot. In-process those are one database transaction; across a network they become distributed-transaction problems, bought in exchange for independent scaling and deployment that a single studio with a handful of branches will never need.

Back Office is the alternative worth recording, because someone will propose it again. It is the one part that could be extracted cheaply — three of its four documented relationships to Booking are plain identity references to `Branch` and `Staff Member`, and it serves exactly one Administrator doing low-traffic data entry. We still decline: a separate deployable, pipeline, and database for one person's expense tracker is overhead with no corresponding benefit.

The boundary earns its keep by keeping that option alive. A modular monolith becomes a big ball of mud precisely when one context starts reading another's tables directly, and by the time that has happened everywhere, extracting anything is no longer possible. Enforcing the seam now costs little and preserves the choice.
