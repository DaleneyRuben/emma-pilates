# Materialize recurring schedules

Status: accepted

Repeating weekly studio schedules are stored as recurring definitions and materialized ahead into concrete bookable occurrences. A Session Schedule generates individual Sessions; a recurring Availability Block generates individual Evaluation slots. Every concrete occurrence has a stable identifier and durable state. Bookings, capacity, exceptions, cancellation, reminders, and history attach to the appropriate concrete occurrence rather than being calculated virtually when a client opens the calendar.

A reconciler following [ADR-0058](./0058-reconcile-due-work-into-pg-boss.md) idempotently fills the configured future booking window. Generated occurrences retain a reference to their source definition, while database uniqueness prevents the same source and local start time from producing duplicates. An authorized user may change an individual occurrence as an exception without changing the recurring definition, and past or already-completed occurrences are never rewritten when that definition changes. The booking-window length and the exact behavior of edits to already-materialized future occurrences remain product rules to set with the scheduling screens.

Weekly definitions use Bolivia weekday and wall-clock time under [ADR-0057](./0057-use-bolivia-time-for-all-business-scheduling.md); concrete occurrences use exact timezone-aware instants. Storing only manually created occurrences was rejected because it would make Administrators and the Nutritionist repeatedly enter a stable weekly schedule. Calculating virtual occurrences on reads was rejected because Bookings, exceptions, cancellations, reminders, capacity, and history require durable identities and state.
