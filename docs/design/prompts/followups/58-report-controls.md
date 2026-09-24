# Follow-up — What the income and expense report shows

Targets: **AW16 (Reporte de ingresos y gastos)**. Send
[30](./30-invariants-checklist.md) (with the corrections carried by
[31](./31-plan-naming-leftovers.md), [40](./40-cancellation-window-wording.md),
and [48](./48-insumos-record-restock.md) §6) and the still-pending
[51](./51-report-salary-all-branches.md) alongside this follow-up.

---

WEB-009 built AW16 against the Context Map's report rule (cash income belongs
to its collection Branch; transfer and Credit-only income and Salary Payments
count only in «Todas las sucursales»; Expenses belong to their Branch),
follow-up 51, ADR-0057, and ADR-0082. Apply only the changes below.

## 1. The header and the top bar

- The top bar's Branch cell is replaced on this page by a quiet line, «El
  reporte usa su propio filtro de sucursal», as the export already draws. At
  420 px the line is left out.
- Top right: **Desde** and **Hasta** date fields (Bolivia dates, inclusive)
  and **Sucursal** («Todas las sucursales», then each Branch; an archived one
  reads «Urubó (archivada)» because its past income and Expenses still
  count). A start after the end says «La fecha inicial no puede ser posterior
  a la final.» under the fields and keeps the last valid report.
- The page opens on «Todas las sucursales» and the last six Bolivia months,
  today included. The subtitle names both: «01/04/2026 – 24/09/2026 · Todas
  las sucursales» or «… · Sucursal Centro».

## 2. The three figures

- Money is always written with centavos: «Bs 5.690,00», never «Bs 5.690».
  A negative net reads «−Bs 2.690,50», still in Plomo cálido.
- The lines under each figure name what it counts:
  - «Todas las sucursales»: Ingresos «Pagos confirmados en el rango» and a
    quieter «Efectivo Bs 4.140,00 · Transferencias Bs 1.550,00»; Gastos
    «Nómina más los gastos de cada sucursal».
  - One Branch: Ingresos «Pagos en efectivo cobrados en Centro»; Gastos
    «Gastos registrados en Centro»; and follow-up 51's caption above the
    figures.
  - Neto: «Ingresos menos gastos».

## 3. The chart

- Every month of the range has its pair of bars, empty months included, on a
  scale whose top rounds up to 1, 2, 2,5, or 5 times a power of ten, with
  three reference lines labelled in whole bolivianos («Bs 0», «Bs 5.000»,
  «Bs 10.000»). Month labels are «Abr», «May», …
- The legend (Ingresos, Gastos) sits at the top right of the card: Éxito and
  Error are close for colour-blind readers, so identity never rests on colour.
- Hovering or focusing a month tints its column in Hover de fila and shows a
  small popover above it: «agosto de 2026», «Ingresos Bs 780,00», «Gastos
  Bs 0,00».
- With nothing in or out in the range, the chart card is replaced by «Sin
  ingresos ni gastos en este rango.» and the three figures read Bs 0,00.

## 4. The two tables

- **Gastos por categoría**: in «Todas las sucursales» the first row is
  «Nómina» with «Viene de Nómina, no de las categorías» under it (follow-up
  51's name, instead of the export's «Sueldos»); then each Expense Category
  by amount; a closing «Total de gastos» row on Superficie sutil. With no
  Expense, the body says «Sin gastos en este rango.»
- **Totales por mes** (new, beside it on desktop, below it at 420 px): Mes,
  Ingresos, Gastos, Neto, one row per month of the range and a closing «Total
  del rango» row. It is the chart's exact view.
- At 420 px both tables become labelled cards like every list, and the
  figures stack.

## Preserve everything else

Do not change the shell, the sidebar, the colour meaning of the three
figures, the flat bars without per-bar values, follow-up 51's Nómina rule, or
any other screen.
