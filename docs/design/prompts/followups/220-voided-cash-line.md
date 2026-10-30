# Follow-up — voided cash stays in the drawer

Targets: **S25 (Cerrar caja)** and **AW151 (Cierres de caja)**. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by FIX-004 on 2026-10-30 (owner decision 4 of 2026-10-28). A void
returns no money, so a voided cash sale stays in the day's «Esperado».
Where the day has any, it shows on its own line.

## `S25` Cerrar caja

- In the «EFECTIVO ESPERADO» card, under «3 ventas en efectivo hoy en
  Centro», add one more line in the same muted style: «Ventas anuladas
  (efectivo en caja): Bs 290». Draw it on one frame only. Days with no
  voided cash sale show no line.

## `AW151` Cierres de caja

- In the «Esperado» cell of a day with voided cash, under the amount, add
  one line in the note size and Texto secundario: «Ventas anuladas
  (efectivo en caja): Bs 290,00». Draw it on one row.
- The «Ajuste» tooltip reads «Una venta registrada después del cierre
  cambió las ventas del día.». A void no longer moves the day's sales.

## Leave untouched

Every other line, the difference colours, and every other screen.
