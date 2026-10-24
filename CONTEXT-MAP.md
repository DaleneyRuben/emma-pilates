# Context Map

## Contexts

- [Booking & Membership](./booking/CONTEXT.md) — class scheduling, subscriptions, and nutritionist evaluations for clients, trainers, and assistants, across one or more branches
- [Back Office](./back-office/CONTEXT.md) — admin-only inventory, pay statements and payroll, cash close, equipment, and expense management
- [System Identity](./system-identity/CONTEXT.md) — shared Accounts, authentication, account activation, recovery, security sessions, and in-app Feedback
- [Studio Management](./studio-management/CONTEXT.md) — the Administrator's finance, indicators, projections, and recommendations, read from the other contexts ([ADR-0103](./docs/adr/0103-studio-management-reads-the-other-contexts.md))

## Relationships

- **Back Office → Booking & Membership**: `Supply` is scoped to a `Branch`; `Branch` is owned and defined by the Booking & Membership context.
- **Back Office → Booking & Membership**: `Salary Payment` references a `Staff Member`; `Staff Member` is owned and defined by the Booking & Membership context.
- **Back Office → Booking & Membership**: `Expense` is scoped to a `Branch`, same as `Supply`.
- **Back Office → Booking & Membership**: total income/expense reports sum confirmed `Payment` Money Amounts (income, owned by Booking & Membership) against `Salary Payment` and `Expense` (both owned by Back Office). Cash income is attributable to its collection `Branch`; transfer, courtesy, and historical Credit-only records are studio-wide and appear only in the all-Branches report, not a single-Branch result. On the expense side, `Expense` is attributable to its `Branch`, while `Salary Payment` is studio-wide and likewise appears only in the all-Branches report.
- **System Identity ↔ Booking & Membership**: System Identity owns `Account` and authentication state; each Account links to exactly one `Client` or `Staff Member`, which remain owned by Booking & Membership and supply the current Role and Branch scope used for authorization.

- **Studio Management → Booking & Membership, Back Office**: reads Sessions, Bookings, Attendance, Subscriptions, Payments, Allowance Adjustments, Founder Memberships, Acquisition Channels, Salary Payments, Pay Statements, Expenses, Cost Budget Lines, and Cash Closes into its own facts; it writes only its own `studio` schema.
- **Back Office → Booking & Membership**: a Cash Close sums the day's confirmed cash `Payment` Money Amounts collected at its `Branch` (read-only); it never writes a Payment, and a sale voided or recorded after the close shows as an adjustment computed from the Payments, never as an edit of the close.
- **Back Office → Booking & Membership**: Pay Statements are calculated from Sessions (Bookings at the window close, «minimum not met» cancellations) and from the first Payments of Clients a Trainer brought; Equipment is scoped to a `Branch` and flags Sessions whose capacity exceeds the working machines.
- **Booking & Membership → Studio Settings**: the configurable rules every context reads (Cancellation Window, Minimum Bookings, prices, tax rate, Opening Date) live in Studio Settings, owned by Booking & Membership ([ADR-0101](./docs/adr/0101-keep-studio-rules-in-studio-settings.md)).

## Shared language

**Money Amount**:
An exact monetary value denominated in Bolivianos (BOB). No workflow accepts, stores, displays, or converts another currency.
_Avoid_: Dollar amount, currencyless amount

## ADRs

Each context keeps its own ADR sequence in its own `docs/adr/` (`booking/docs/adr/0001…`). Decisions that span contexts, or concern the system as a whole rather than one context's domain model, live in the root [`docs/adr/`](./docs/adr/) (`0004…`) instead of being forced into either context's sequence.
