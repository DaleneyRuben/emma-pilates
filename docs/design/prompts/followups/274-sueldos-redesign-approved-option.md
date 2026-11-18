# Follow-up — Walkthrough finding 105: Dinero › Sueldos (approved option)

Targets: **P06 Dinero › Sueldos › Por aprobar** (1440 and 420). Read with
[273](./273-sueldos-redesign-proposals.md), whose export in
`design/v2/propuestas-sueldos/` (board `Selector.dc.html` with `opcion="A"`,
and `OpcionA420.dc.html`) is the drawing of record. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written on 2026-11-18 for DES-022 and FIX-070. The owner chose **A ·
Resumen que se despliega** in the walkthrough session.

## What is built

Everything 273 lists under «What every option keeps», laid out as A:

- one card per statement, full width; its header holds the avatar, the name,
  «role · N líneas», the state pill, the total and, at the right, **Aprobar
  pago** (small primary) or the wait note «Se aprueba desde el …»;
- below, one row per concept: its name and the toggle («Ver las 54», «Ver la
  clase», «Ver las 2 clientas» / «Ocultar»), count × rate and subtotal; then
  «Total»;
- an open concept lists its lines in a box that scrolls past about ten.

## Correction to 273's drawing

From here on, read each detail row as **two columns, «Detalle» and
«Monto»**, instead of Fecha / Hora / Sucursal / Clase. The line's detail is
one text the API stores with the line («lun 2 nov · 07:00 · Sopocachi ·
Reformer», «Lucía Mendoza · Paquete de 8 clases · 10 % de Bs 480»), so a
statement approved before finding 105, whose lines read «Mínimo no
alcanzado», still shows correctly. At 420 the row stays one line with the
amount at the right.

The rate column for a commission reads «2 comisiones» (each is 10 % of a
different Plan), and for amounts that differ, each amount with its count
(«4 × Bs 50,00 · 1 × Bs 80,00»).

## Keep

Everything else in 273, the other Dinero tabs and the brand of 225.
