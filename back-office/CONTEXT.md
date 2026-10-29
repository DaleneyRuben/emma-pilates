# Back Office

Admin-only inventory, payroll, cash, equipment, and expense management for running the studio's business side — separate from the client-facing booking and membership system.

## Language

**Supply**:
A consumable item used to run a Branch's physical space (e.g. toilet paper, cleaning products) — not equipment or fixed assets. Scoped to a single Branch; each Branch tracks its own quantity on hand, counted in whole units and changed only by Withdrawals and Restocks. A quantity at or below its threshold shows a low-stock alert. A discontinued Supply is archived, never deleted, so its history stays.
_Avoid_: Insumo, Inventory item, Product

**Withdrawal**:
A logged record of taking units of a Supply out of a Branch's storage, decrementing its quantity on hand. Recorded explicitly by staff at the moment of taking the item — never inferred from periodic recounts. The basis for monthly consumption reports. Immutable once logged; it can never take the quantity on hand below zero.
_Avoid_: Consumption, Depósito, Stock movement

**Restock**:
A logged record of putting units of a Supply into a Branch's storage, incrementing its quantity on hand (UI: "Reposición"). It records units only, never money — paying for the supplies is an Expense if the Administrator records one. Immutable once logged, like a Withdrawal.
_Avoid_: Replenishment, Stock movement, Recount

**Salary Payment**:
A record that a Staff Member was paid — amount and date. For a Trainer or the Coordinator it is created when the Administrator approves their Pay Statement; for anyone else (the Assistant, cleaning) the Administrator logs it by hand. Unlike Supply and Expense, a Salary Payment is **not** scoped to a Branch: a Staff Member may be assigned several Branches and a single payment covers all their work. Narrowing payroll to a Branch therefore selects the Staff Members assigned to it, not the payments themselves — the same payment shows under every Branch its Staff Member works at — so a true per-Branch salary cost is not a figure the system can produce.
_Avoid_: Salario, Payroll, Wage, Salary (as a rate)

**Pay Rate Rule**:
The dated rates a Pay Statement is calculated with ([ADR-0105](../docs/adr/0105-calculate-staff-pay-in-the-system.md)). For Trainers: Bs 65 per taught Session with up to 4 students, Bs 8 per student from the fifth — counted on the Bookings the Session held when its Cancellation Window closed, no-shows included — Bs 25 per Session cancelled for not reaching the Minimum Bookings, and 10 % of what each Client the Trainer brought actually paid for her first Plan. For the Coordinator: a Bs 3,500 base, Bs 50 per new Client on a 30-day Plan and Bs 80 on a 60- or 90-day Plan (none for the single class, Gift Classes, or Guest Passes, and none when a Trainer brought the Client), and a Bs 400 bonus when the month's renewal rate reaches its target (80 % in months 1–6 of operation, 85 % in months 7–12, 90 % after).
_Avoid_: Tarifa (in code), salary scale

**Pay Statement**:
A Trainer's or the Coordinator's monthly pay, drafted by the system from the Pay Rate Rules with one line per item, approved by the Administrator, and then paid as a Salary Payment. A commission belongs to the month its Payment was confirmed. A Trainer sees only her own statement; the Coordinator sees none, not even her own.
_Avoid_: Payslip, nómina (in code)

**Renewal Rate**:
The share of Clients whose real Plan ended in a month who bought another real Plan whose Payment was approved, on the Bolivia date, before that end or within 7 days after it, whatever Start Date she chose. Guest Passes, Courtesy Access, and other non-real Subscriptions are not renewals. The Coordinator's bonus and the KPIs use this one definition (owner, 2026-10-28).
_Avoid_: Retention (retention is measured at 90 days)

**Cash Close**:
The end-of-day count of a Branch's cash: the expected cash (the day's confirmed cash Payments there, up to the close, including a cash sale voided later, because no money is returned), the cash counted, the difference, and a note. A voided cash sale stays in the expected cash and appears on its own line, «Ventas anuladas (efectivo en caja)»; if money is ever given back, the Administrator records it as an outflow (owner, 2026-10-28). One a day per Branch, made by an Assistant at her Branch or an Administrator, and never edited; a cash sale recorded after the close the same day shows as an adjustment. A past day with cash sales and no close is flagged. Only an Administrator sees the history.
_Avoid_: Arqueo (in code), shift close

**Equipment**:
A numbered machine of a Branch — a reformer, a cadillac, or a mat — whose faults are logged as Equipment Issues. Its kind and number («Reformer 3») identify it within the Branch; an Administrator registers it and retires it (archived, never deleted, so its Issues stay). The mat area is registered as one Equipment per mat place, so mat Sessions are checked the same way as the machines. A piece of Equipment is **working** unless it is retired or has an open Equipment Issue marked out of service. Sessions whose capacity exceeds the working Equipment of their kind at their Branch are flagged on the schedule so someone lowers the capacity; the system never changes a capacity itself ([ADR-0106](../docs/adr/0106-log-equipment-faults.md)). A kind with no Equipment registered at the Branch is not checked.
_Avoid_: Asset, Machine (in code), Supply (a Supply is consumable)

**Equipment Kind of a Class Type**:
Which Equipment a Session uses is read from its Class Type's name (BKO-004): the first of the words «reformer», «cadillac», and «mat» found in it as a whole word, ignoring case and accents («Reformer Pilates» → reformer, «Mat Pilates» → mat). A Class Type whose name holds none of them («Pilates Prenatal») uses no counted Equipment and its Sessions are never flagged. Naming the Class Type is therefore how the Administrator links it to a kind; there is no separate setting.
_Avoid_: Equipment needs (that free-text field of the Class Type is a description for Clients and is not read)

**Equipment Issue**:
A fault reported on one piece of Equipment: when and by whom it was reported, a description, whether the machine is out of service, and, once fixed, when and by whom it was resolved. A Trainer reports it from a Session of her agenda, choosing among the Equipment of that Session's Branch; an Administrator may also record one. Only an Administrator resolves it (the Coordinator joins with IDN-009). A resolved Issue is kept as history and never reopened; a new fault is a new Issue.
_Avoid_: Ticket, Incident, Falla (in code)

**Cost Budget Line**:
The monthly amount budgeted for an expense line (rent, the Coordinator, the front desk, utilities, software, cleaning, the accountant, maintenance, advertising, supplies), plus a contingency of 10 % of their sum, compared with what was actually spent. The fee owed to the Nutritionist for each Evaluation held (Bs 50) is a cost too.
_Avoid_: Forecast, target

**Expense Category**:
An Administrator-managed label for grouping Expenses (e.g. "Mantenimiento," "Reparación"). The Administrator can add new categories at any time; every Expense references exactly one.
_Avoid_: Tag, free text

**Expense**:
A cost recorded by the Administrator for running a Branch (e.g. a repair or maintenance cost), with an amount, date, and Expense Category. Scoped to a single Branch, same as Supply.
_Avoid_: Gasto, Cost
