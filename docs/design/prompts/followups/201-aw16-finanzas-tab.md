# Follow-up — AW16 becomes two tabs, and Finanzas shows the month

Targets: **AW16 (Reporte de ingresos y gastos)**. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by BKO-005 on 2026-10-23 from decisions section 11 and the backlog
row. The diagnosis asked for a «Finanzas» screen whose current report is a
tab. The canvas export was not run: the design session refused creating a
canvas, so this follow-up stays pending and the admin web is built from
this text.

## 1. Two tabs under the title

The page title stays «Reporte de ingresos y gastos». Under it, a tab list
named «Vistas del reporte» holds **Reporte** (selected on open) and
**Finanzas**. Reporte is the page as follow-ups 51, 58, and 200 left it:
Desde, Hasta, Sucursal, the three figures, the chart, both tables, and the
voided-sales list. Those controls stay on Reporte only. Finanzas does not
inherit the date range or the Branch selector.

The top bar still says «El reporte usa su propio filtro de sucursal» on
desktop and leaves that line out at 420 px, on both tabs.

## 2. Finanzas — one Bolivia month

A month stepper («Mes anterior», the month's name, «Mes siguiente») opens
on the current Bolivia month and does not step past it. The address keeps
`?vista=finanzas&month=YYYY-MM`.

Four figures, written with centavos (`Bs 2.280,00`; a loss as
`−Bs 2.100,50`):

- **Ingresos en caja** (Éxito): confirmed Payments of the month. The line
  under it is «Pagos confirmados en el mes».
- **Impuesto** (Plomo cálido): the tax, with «16 % de los ingresos en caja»
  (the percent comes from the settings).
- **Resultado** (Éxito when it is not negative, Error when it is): cash
  income less the tax, the actual costs, and the Nutritionist's cost. The
  line is «Ingresos en caja menos impuesto, gastos y nutricionista».
- **Punto de equilibrio** (Plomo cálido): the cash income that covers the
  budget, including contingencies, and the Nutritionist's cost, after tax.
  The line is «Ingreso en caja que cubre el presupuesto y la nutricionista».

Below the figures, a quiet line names the Nutritionist's cost:
«Costo de la nutricionista Bs 150,00».

## 3. Presupuesto frente a lo gastado

A table named «Presupuesto frente a lo gastado», columns **Línea**,
**Presupuesto**, **Gastado**. One row per budget line, then a row
«Imprevistos (10 %)» whose Gastado is «—» (contingencies are computed, not
spent), then a closing **Total** on Superficie sutil. Amounts are
right-aligned on desktop. At 420 px the table becomes labelled cards, like
every other list.

## 4. Empty budget

With no budget line, the four figures stay and the table is replaced by
«Aún no hay presupuesto.» and one solid button, «Cargar presupuesto de
apertura». While it works the button is busy. After it loads, the ten
opening lines appear and the button is gone. A second load does not add
lines.

## Leave untouched

The Reporte tab's figures, chart, tables, voided-sales list, range, and
Branch selector. The sidebar stays «Reporte». No other screen changes.
