# Put finance and analytics in a Studio Management context that only reads

Status: accepted (2026-10-23)

The owner wants to steer the studio with data: a monthly result with tax and costs, cash and accrued revenue, indicators, projections, a simulator, and recommendations. None of it captures new facts; it reads what Booking & Membership and Back Office already record.

A fourth bounded context, **Studio Management**, with its own `studio` schema and NestJS module, recalculates facts (one row per Session, one per Client and month, revenue per Subscription and month) from the other contexts through their interfaces, nightly and on demand, idempotently for the current month and the two before; closed months stay frozen unless recalculated by hand, and every indicator carries its formula version. Only the Administrator sees amounts; the Coordinator sees counts.

The calculations live as pure functions in a shared package, so the web, the worker, and an AI report use the same arithmetic. The owner accepts (decisions, section 13) sending a monthly summary of aggregates, never a Client's name, to an external AI provider for a narrated report and plain-language questions; the AI proposes and never acts.

Rejected: a BI tool or a data warehouse (an extra system for a few hundred rows a month); computing indicators on the fly from transactional tables (slow history and definitions that drift silently).
