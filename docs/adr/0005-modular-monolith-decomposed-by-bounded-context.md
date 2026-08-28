# Build a modular monolith decomposed by bounded context

Status: accepted

The system ships as a single deployable with Booking & Membership, Back Office, and System Identity as enforced top-level modules, mirroring the contexts documented in [CONTEXT-MAP.md](../../CONTEXT-MAP.md). The module boundary is real and checked, not a naming convention.

The case against splitting into services is transactional rather than about scale. Creating a Booking must atomically consume one unit of a Subscription's allowance, and waitlist promotion must check a candidate's eligibility and create their Booking without a concurrent cancellation promoting the same person twice or handing two clients one spot. In-process those are one database transaction; across a network they become distributed-transaction problems, bought in exchange for independent scaling and deployment that a single studio with a handful of branches will never need.

Back Office is the alternative worth recording, because someone will propose it again. It is the one part that could be extracted cheaply — three of its four documented relationships to Booking are plain identity references to `Branch` and `Staff Member`, and it serves exactly one Administrator doing low-traffic data entry. We still decline: a separate deployable, pipeline, and database for one person's expense tracker is overhead with no corresponding benefit.

The seam is enforced asymmetrically, and only against writes. A module may never write to another module's tables; every write goes through the owning module. Reads are unrestricted — Back Office queries Booking's tables directly, which is how the income/expense report sums `Payment` against `Salary Payment` and `Expense` in one query rather than assembling the figure across a service call.

This is a deliberate trade against future extraction, and it should not be read as preserving that option. Cross-module reads are precisely what a split would have to undo: writes were never entangled, so the reads are the whole cost, and each new one raises it. A second consequence is that Booking's schema has readers it cannot see — renaming a column can break a Back Office report while Booking's own tests stay green. We accept both because a single studio with a handful of branches will not outgrow one deployable, and paying a service-call tax today to protect a split we do not expect to make is the more speculative bet. Extracting Back Office later means writing the read API that this decision skips.
