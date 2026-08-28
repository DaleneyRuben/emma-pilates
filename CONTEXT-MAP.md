# Context Map

## Contexts

- [Booking & Membership](./booking/CONTEXT.md) — class scheduling, subscriptions, and nutritionist evaluations for clients, trainers, and assistants, across one or more branches
- [Back Office](./back-office/CONTEXT.md) — admin-only inventory, payroll, and expense management
- [System Identity](./system-identity/CONTEXT.md) — shared Accounts, authentication, account activation, recovery, and security sessions

## Relationships

- **Back Office → Booking & Membership**: `Supply` is scoped to a `Branch`; `Branch` is owned and defined by the Booking & Membership context.
- **Back Office → Booking & Membership**: `Salary Payment` references a `Staff Member`; `Staff Member` is owned and defined by the Booking & Membership context.
- **Back Office → Booking & Membership**: `Expense` is scoped to a `Branch`, same as `Supply`.
- **Back Office → Booking & Membership**: total income/expense reports sum `Payment` (income, owned by Booking & Membership) against `Salary Payment` and `Expense` (both owned by Back Office).
- **System Identity ↔ Booking & Membership**: System Identity owns `Account` and authentication state; each Account links to exactly one `Client` or `Staff Member`, which remain owned by Booking & Membership and supply the current Role and Branch scope used for authorization.

## Shared language

**Money Amount**:
An exact monetary value denominated in Bolivianos (BOB). No workflow accepts, stores, displays, or converts another currency.
_Avoid_: Dollar amount, currencyless amount

## ADRs

Each context keeps its own ADR sequence in its own `docs/adr/` (`booking/docs/adr/0001…`). Decisions that span contexts, or concern the system as a whole rather than one context's domain model, live in the root [`docs/adr/`](./docs/adr/) (`0004…`) instead of being forced into either context's sequence.
