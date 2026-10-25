# Follow-up — AW37 gains Proyección

Targets: **AW37 (Simulador)**. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by STU-005 on 2026-10-23 from the diagnosis's section 3.4 and the
decision recorded on the backlog row. The diagnosis asks for projections at
3, 6, and 12 months with three scenarios. The studio has fewer than three
months of measured data, so the projection repeats the simulator's month
instead of a trend, and the page says so. The canvas export was not run:
the design session was not available, so this follow-up stays pending and
the admin web is built from this text.

## 1. A section under the derivation

Keep AW37 exactly as its prompt left it, through the derivation line. Under
that line, add a section titled **Proyección** (Lora, the panel title size).
The note under the title reads «El mes de arriba se repite. Bajo es el 80 %
de las alumnas y Alto el 120 %, con un tope de 12 por clase.» There is no
save button and no spinner: the table is the same calculation as the figures
above it.

## 2. The table

A table named «Proyección a 3, 6 y 12 meses», the same dense table as AW16's
budget table. Columns, left to right: **Meses**, **Escenario**, **Ingreso**,
**Costos**, **Impuesto**, **Resultado**. The last four are right-aligned and
tabular. Nine rows, in this order, for the opening values (33, 4, 65, 21175,
16):

| Meses | Escenario | Ingreso | Costos | Impuesto | Resultado |
| --- | --- | --- | --- | --- | --- |
| 3 | Bajo | Bs 83.655,00 | Bs 91.410,00 | Bs 13.384,80 | −Bs 21.139,80 |
| 3 | Base | Bs 111.540,00 | Bs 91.410,00 | Bs 17.846,40 | Bs 2.283,60 |
| 3 | Alto | Bs 139.425,00 | Bs 91.410,00 | Bs 22.308,00 | Bs 25.707,00 |
| 6 | Bajo | Bs 167.310,00 | Bs 182.820,00 | Bs 26.769,60 | −Bs 42.279,60 |
| 6 | Base | Bs 223.080,00 | Bs 182.820,00 | Bs 35.692,80 | Bs 4.567,20 |
| 6 | Alto | Bs 278.850,00 | Bs 182.820,00 | Bs 44.616,00 | Bs 51.414,00 |
| 12 | Bajo | Bs 334.620,00 | Bs 365.640,00 | Bs 53.539,20 | −Bs 84.559,20 |
| 12 | Base | Bs 446.160,00 | Bs 365.640,00 | Bs 71.385,60 | Bs 9.134,40 |
| 12 | Alto | Bs 557.700,00 | Bs 365.640,00 | Bs 89.232,00 | Bs 102.828,00 |

Money is «Bs 1.200,00», and a loss keeps the minus sign of the other money
figures («−Bs 21.139,80»). Changing a field recalculates the table at once.
A value that is not a whole number, or a tax of 100 or more, hides the table
with the figures, behind the existing alert.

## 3. Frames

1. **Escritorio · 1440 px** — AW37 as its prompt, plus the section above.
   **Simulador** stays active.
2. **Móvil · 420 px** — the table becomes one labelled card per row (Meses,
   Escenario, Ingreso, Costos, Impuesto, Resultado). The sidebar stays behind
   **Abrir menú**.

## What stays untouched

The five fields, the two figures, the derivation, the subtitle, and the
refusal for a role that is not the Administrator. No new sidebar entry: the
section lives on AW37. Follow-up 202 still owns the **Simulador** entry.
The break-even in students per class, occupancy, and clients is not drawn.
