# Follow-up — `AW28` lists every sale for the accountant

Targets: **AW28 (Pagos · Web Admin)**, its desktop frame and its narrow
frame; the **generated handoff `design/README.md`** (the `AW28` inventory
row). Send [30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by PAY-007 on 2026-10-23. Every sale now may carry Invoice Data (a
NIT or CI and a name or business name, [145](./145-payment-invoice-data.md)
and [146](./146-cash-payment-invoice-data.md)); invoices are issued outside
the system, and the Administrator marks each one «Factura emitida», which
records who and when, filters the sales still unbilled, and hands the
accountant a CSV (owner, 2026-10-23; booking ADR-0012). `AW28` is the
studio's sales list, so it gains the cash sales (until now only transfers
were listed, because only transfers are reviewed), the invoice column, the
filter, and the export. Reviewing a pending transfer (`AW29`) does not
change.

## 1. Header

- The subtitle stays «Todo el estudio · N transferencias esperando
  revisión».
- On the right of the title, the neutral button «Exportar CSV» with the
  16 px download line icon, exactly as `AW35` draws it. It downloads the rows
  the current filters show, every page, never just the visible one.

## 2. Filter row

After «Estado», a second dropdown **«Factura»** with «Todas» (default) and
«Sin factura emitida». «Sin factura emitida» lists the confirmed sales whose
client asked for an invoice and that are not marked yet; the empty state
then reads «No hay facturas pendientes.» with the hint «Cuando una venta con
datos de factura se confirma, aparece aquí.».

## 3. Table

- A **«Método»** column after «Plan», in `#6E6663`: «Transferencia» or
  «Efectivo».
- A **«Factura»** column after «Estado», two lines:
  - With Invoice Data: the NIT or CI in tabular `#4A4A4A` 13 px, and the name
    or business name under it in 12 px `#7A716D`, truncated with an ellipsis.
  - Without: «Sin factura» in 13 px `#7A716D`.
  - Under that, on a **confirmed** row only: «Marcar emitida», the tertiary
    text button of the admin web (13 px weight 500 Palo de rosa `#B78380`,
    no border), or, once marked, the Éxito pill «Emitida»
    (`rgba(124,148,115,0.14)` / `#5F7457`, 12 px weight 500, fully rounded)
    followed by «por Paola Mendoza · 23/10/2026» in 12 px `#7A716D` and the
    tertiary text button «Deshacer».
  - Pending and rejected rows show only the data line.
- Draw sample rows that show each case: a pending transfer with data
  («4567891 / Ana Pérez»), a confirmed cash sale with «Marcar emitida», a
  confirmed transfer marked «Emitida», and a confirmed cash sale «Sin
  factura».

The narrow (420 px) frame stacks the same content in each row card:
«Método» beside the plan, and the «Factura» block at the bottom of the card.

## 4. CSV columns

For the README: «Fecha» (dd/mm/aaaa, Bolivia), «Cliente», «Plan»,
«Método», «Monto (Bs)», «Estado», «NIT o CI», «Nombre o razón social»,
«Factura emitida» (Sí / No), «Emitida por», «Emitida el»; UTF-8 with a
byte-order mark, CRLF rows, file `pagos-aaaa-mm-dd.csv`.

## 5. README

The `AW28` inventory row becomes: «Every transfer and cash sale of the
studio (not branch-scoped), with «Estado» and «Factura» filters («Sin
factura emitida»), a «Método» column, a «Factura» column with «Marcar
emitida» / «Emitida» + «Deshacer» on confirmed sales, and «Exportar CSV» of
the filtered rows (PAY-007); a Pendiente row opens `AW29`».

## What must remain untouched

The sidebar and its badge, the search field, «Estado» and its default
Pendiente, the «Cliente», «Plan», «Monto», «Fecha», and «Estado» columns and
pills, the row click into `AW29`, `AW29` itself, and every other admin page.
