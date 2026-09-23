# ADM-001 — Admin-web APIs and Session occurrence schema

Status: **approved 2026-09-23 under the blanket backlog-decision approval**
(the user pre-approved the overnight queue's migrations on condition that each
has a proposal and a review package committed before the migration).

ADM-001 delivers the backend the admin web needs for WEB-003 (schedule,
Sessions, Trainer swap, Plans, Class Types, Branches), WEB-008 (Evaluation,
Referral, and Credit lists plus the Administrator Evaluation cancel), and the
income half of WEB-009's report. Every endpoint lives under
`/api/v1/administrator/…`, requires the Administrator Role, answers `no-store`,
and uses page-and-offset pagination for tables (ADR-0061/0062). Admin-web-only
operations are added to the mobile-compatibility exemptions (BE-003).

## Decisions (taken under the blanket approval)

### Catalog (slice A)

| # | Decision | Rationale |
| --- | --- | --- |
| A1 | **Branches**: create (name, address), update, and archive. Archive is refused (`409 branch_in_use`) while the Branch has scheduled future Sessions or still-effective Session Schedules; otherwise it sets `archived_at` and ends every Nutritionist's Availability Blocks there through the D15 port. Staff assignments stay as history; archived Branches are already unusable for new blocks, schedules, and assignments. | NUT-001 D15 and the BKM-003 gap ("Branch archival does not withdraw Sessions") — refusing is safer than silently cancelling booked classes. |
| A2 | **Class Types**: create, update (name, description, duration, default capacity, equipment), archive. Archive is refused (`409 class_type_in_use`) while an effective Session Schedule uses it. Edits never rewrite existing Sessions (follow-up 39 §2); new durations apply to Sessions materialized afterwards. Duplicate active names answer `409 class_type_name_taken` (existing unique index). | Existing concrete Sessions keep their facts (ADR-0059). |
| A3 | **Plans**: create, update (name, duration 1/3/6/12, class allowance, price in centavos, display order), hide and show. Subscriptions keep their snapshots; open Purchase Intents keep the amount they were created with. Plan creation, update, and visibility changes are audited (`plan.created`, `plan.updated`, `plan.visibility_changed`) because they change what Clients pay. | PAY-001 snapshots; ADR-0055 catalog of financial changes. |

### Session Schedules (slice B)

| # | Decision | Rationale |
| --- | --- | --- |
| B1 | Create a weekly Session Schedule (Branch, Class Type, Trainer, weekday, Bolivia start time, capacity, **Vigente desde** ≥ today) and materialize it synchronously, reporting how many occurrences were created and how many were skipped for overlapping an existing Session. | Mirrors Availability Blocks (NUT-002) so the admin calendar is right immediately. |
| B2 | **Esta y las futuras** replaces a schedule from a date: the old schedule ends at that date (`effective_until`), its **unbooked, non-exception** future Sessions from that date are cancelled with the new cause `schedule_changed`, and the replacement is created and materialized. Sessions with a Booking or an active Waitlist Entry, and exceptions, are kept and reported. The date must be after the old schedule's `effective_from` and not before today. | ADR-0059 and the glossary: "updates only unbooked future Sessions". Cancelling (rather than deleting) keeps durable occurrence history and never breaks foreign keys. |
| B3 | Ending a schedule from a date cancels its unbooked future Sessions the same way. | Same rule. |
| B4 | The Trainer must hold the Trainer Role and the Branch assignment, the Branch and Class Type must be active, and capacity must be positive. | BKM-001 validation, already enforced by the reconciler's eligibility filter. |

### Sessions (slice C) — schema change

| # | Decision | Rationale |
| --- | --- | --- |
| C1 | Add **`sessions.occurrence_starts_at`**: the schedule occurrence a generated Session stands for. It equals `starts_at` when materialized and **never changes**, even when the Session moves; it is null for one-off Sessions. The unique key becomes `(session_schedule_id, occurrence_starts_at)`. | Today the key is `(session_schedule_id, starts_at)`, so moving a generated Session frees its original start and the reconciler recreates it (BKM-003 gap). Keying the occurrence, not the current start, stops that. |
| C2 | A `BEFORE INSERT` trigger fills `occurrence_starts_at` from `starts_at` when a generated row omits it, and a check requires `occurrence_starts_at` exactly for generated rows. | Expand-only rollout (ADR-0078): a worker still running the previous release keeps inserting valid rows. |
| C3 | Add the cancellation cause **`schedule_changed`** (actor required, like `no_substitute_trainer`). | B2/B3 need a truthful cause; the check constraint is widened accordingly. |
| C4 | **Solo esta sesión**: an Administrator edits one future scheduled Session's Trainer, start, or capacity. It becomes an exception (`is_exception = true`); a start change keeps the duration, **clears `empty_booking_check_completed_at`** (the 2-hour check must run for the new start, BOOK-004 gap), and notifies booked Clients; a Trainer change is the Trainer swap and notifies the newly assigned Trainer (AW03). Capacity cannot drop below the booked count. Overlaps answer `409 session_overlap` from the exclusion constraints. | AW03, follow-up 39 §1, BOOK-004 and BKM-003 gaps. |
| C5 | **One-off Sessions** (Una sola vez): Branch, Class Type, Trainer, start instant, capacity (default from the Class Type); `ends_at` from the Class Type's duration; `is_exception = true`, no schedule. | Follow-up 39 §1. |
| C6 | Session edits are audited as `session.updated` with the changed fields (the Trainer swap and time change are materially important administrative actions). | ADR-0055. |

### Oversight lists and income (slices D, E)

| # | Decision | Rationale |
| --- | --- | --- |
| D1 | `GET /administrator/evaluations` lists booked Evaluations in a date range (default: the current Bolivia week), optionally by Nutritionist, with Client, Nutritionist, Branch, and start; no status column (AW25). `DELETE /administrator/evaluations/{id}` reuses the NUT-002 staff cancel (Administrator branch of D14). | AW25; NUT-002 left the route to ADM-001. |
| D2 | `GET /administrator/referrals` lists every Referral with referrer, referred Client, registration date, and state, searchable by either Client's name (accent-insensitive through STAFF-004's `search_text`). | AW26. |
| D3 | `GET /administrator/credits` lists Clients with a positive available Credit balance, their balance, and last ledger movement, plus the studio-wide outstanding total; searchable by name. | AW27. |
| D4 | `GET /administrator/reports/income?from&to&branchId?` sums **confirmed** Payments' amount paid (centavos) by Bolivia month and by method. A single-Branch result includes only cash Payments collected there; the all-Branches result includes transfer and Credit-only Payments too (CONTEXT-MAP). Expenses join in BKO-002/WEB-009. | CONTEXT-MAP relationship rule; AW16. |

## Schema impact (slice C only)

| Object | Change |
| --- | --- |
| `booking."SessionCancellationCause"` | add value `schedule_changed` (its own migration, because a new enum value cannot be used in the transaction that adds it) |
| `booking.sessions.occurrence_starts_at` | new nullable `timestamptz(3)`; backfilled to `starts_at` for generated rows |
| `sessions_occurrence_check` | `(session_schedule_id IS NULL) = (occurrence_starts_at IS NULL)` |
| `sessions_default_occurrence` trigger | fills the occurrence on insert when a generated row omits it |
| unique index | `(session_schedule_id, starts_at)` → `(session_schedule_id, occurrence_starts_at)` |
| `sessions_cancellation_check` | widened: `schedule_changed` requires an actor |

No other table changes: Branch, Class Type, and Plan archival/visibility
columns already exist, and the lists read existing tables.

## Representative rows

| Session | `session_schedule_id` | `starts_at` | `occurrence_starts_at` | `is_exception` |
| --- | --- | --- | --- | --- |
| Materialized Monday 07:00 | S1 | 2026-09-28 11:00Z | 2026-09-28 11:00Z | false |
| Same one moved to 08:00 | S1 | 2026-09-28 12:00Z | 2026-09-28 11:00Z | true |
| Reconciler rerun | S1 | — | 2026-09-28 11:00Z | conflict → no new row |
| One-off Saturday class | null | 2026-10-03 13:00Z | null | true |
| Old schedule's unbooked Monday after replacement | S1 | 2026-10-05 11:00Z | 2026-10-05 11:00Z | false, `cancelled` / `schedule_changed` |
