# Back Office

Admin-only inventory, payroll, and expense management for running the studio's business side — separate from the client-facing booking and membership system.

## Language

**Supply**:
A consumable item used to run a Branch's physical space (e.g. toilet paper, cleaning products) — not equipment or fixed assets. Scoped to a single Branch; each Branch tracks its own quantity on hand. Falling below a threshold triggers a low-stock alert.
_Avoid_: Insumo, Inventory item, Product

**Withdrawal**:
A logged record of taking units of a Supply out of a Branch's storage, decrementing its quantity on hand. Recorded explicitly by staff at the moment of taking the item — never inferred from periodic recounts. The basis for monthly consumption reports.
_Avoid_: Consumption, Depósito, Stock movement

**Salary Payment**:
A record, logged manually by the Administrator, that a Staff Member was paid — amount and date only. How the amount is arrived at (per Session, per day, per month, or any other arrangement) happens entirely outside the system; the system only records that the payment happened, for expense reporting.
_Avoid_: Salario, Payroll, Wage, Salary (as a rate)

**Expense Category**:
An Administrator-managed label for grouping Expenses (e.g. "Mantenimiento," "Reparación"). The Administrator can add new categories at any time; every Expense references exactly one.
_Avoid_: Tag, free text

**Expense**:
A cost recorded by the Administrator for running a Branch (e.g. a repair or maintenance cost), with an amount, date, and Expense Category. Scoped to a single Branch, same as Supply.
_Avoid_: Gasto, Cost
