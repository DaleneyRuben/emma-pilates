# Follow-up — Salary Payments count only in the all-Branches report

Targets: **AW16 (Reporte de ingresos y gastos)**. Send as a follow-up.

---

A Salary Payment is studio-wide: one payment covers all of a Staff Member's
Branches, so there is no per-Branch salary figure (`back-office/CONTEXT.md`,
*Salary Payment*). [`CONTEXT-MAP.md`](../../../../CONTEXT-MAP.md) now states
the report rule: Salary Payments appear only when the Branch selector is
**"Todas las sucursales"**, the same way transfer and Credit-only income
appear only there.

1. In the breakdown table, show **"Nómina"** as its own row alongside the
   Expense Categories, only in the "Todas las sucursales" frame.
2. Add a frame with a single Branch selected (e.g. "Centro"): "Gastos" there is
   that Branch's Expenses only, the "Nómina" row is absent, and a one-line
   caption under the stat tiles reads "La nómina y los ingresos por
   transferencia se ven solo en «Todas las sucursales»."

Nothing else on AW16 changes.
