# Studio Management

How the studio is doing and where it is heading: the Administrator's finance, indicators, projections, and recommendations ([ADR-0103](../docs/adr/0103-studio-management-reads-the-other-contexts.md)). It only reads what Booking & Membership and Back Office record, into its own facts, and writes nothing else. The Coordinator sees counts only, never an amount.

## Language

**Session Fact**:
One row per taught or cancelled Session, recalculated from the source tables: day, time, Class Type, Trainer, capacity, Bookings at the window close, attended, no-shows, late cancellations, Waitlist, and cancellation cause.
_Avoid_: Report row, snapshot (without the Fact qualifier)

**Client Month Fact**:
One row per Client and month: cohort (month of her first real Subscription), Acquisition Channel, Plan, classes used, attendance, last Booking, and whether she was active, activated, and renewed.
_Avoid_: Customer record

**Cash Revenue**:
Confirmed Payments by the day they were confirmed, less voided ones. Courtesy Payments are Bs 0 and store-review rows never count.
_Avoid_: Income (without saying which view)

**Accrued Revenue**:
Each Subscription's Payment spread evenly over the days of its date range, so a month earns what its days used; the rest is deferred revenue, shown with the classes still owed.
_Avoid_: Earned income, devengado (in code)

**Monthly Statement**:
A month's cash and accrued revenue, the estimated tax (16 % of sales, Studio Settings), fixed costs budgeted and actual, staff pay, Nutritionist fees, the result, and the margin, compared with the previous month and with the break-even point.
_Avoid_: P&L, balance sheet

**Break-even Point**:
The revenue that covers fixed costs and Trainer pay after tax, expressed also as Clients and as students per Session.
_Avoid_: Target

**Indicator**:
A named, versioned formula over the facts — average students per Session, occupancy, active Clients, new Clients by channel, activation, 90-day retention, Renewal Rate, Founders sold and their cost, revenue per Client, no-shows, classes lost at expiry — calculated per month.
_Avoid_: KPI (in code), metric (without its formula)

**Projection**:
A 3-, 6-, or 12-month forecast from the last three months' trend, in a base, a pessimistic, and an optimistic scenario. With fewer than three months of data it starts from the Simulator's assumptions and says so.
_Avoid_: Prediction, budget

**Simulator**:
A what-if calculation from editable prices, schedule, occupancy, Plan mix, costs, rates, and tax, showing the result and the break-even point with its derivation.
_Avoid_: Calculator, model

**Recommendation**:
A finding a rule raises from the facts — a weak or full time slot, an inactive Client, an unclosed cash day, a budget overrun — with the data behind it and a status (new, seen, dismissed, resolved). It proposes and never acts. A monthly narrated report and questions in plain language may use an external AI on aggregates only, never a Client's name.
_Avoid_: Insight, alert (Contact Alerts belong to Booking & Membership)
