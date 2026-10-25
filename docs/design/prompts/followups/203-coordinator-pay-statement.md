# Follow-up — Coordinator pay statement

Targets: **AW11 (Nómina)**. Send [30](./30-invariants-checklist.md)
alongside this follow-up. Follow-up 202 stays as it is.

---

Written by BKO-007 on 2026-10-23 from decisions section 9 and ADR-0105. The
canvas export was not run: this follow-up stays pending and the admin web
is built from this text.

## 1. AW11 gains a third page, not a tab

Nómina and «Pagos a instructoras» stay as they are. A new sidebar row
**Pago a la coordinadora**, directly under «Pagos a instructoras» and above
Nómina, opens a studio-wide page of the same name. The subtitle reads
«Todo el estudio · solo lo ve la administradora.» The top bar says the
page is not filtered by Branch.

A month stepper («Mes anterior», the month's name, «Mes siguiente») opens
on the current Bolivia month and does not step past it. The address keeps
`?month=YYYY-MM`. There is no «Calcular mes» button: the worker drafts the
month. One card names the Coordinator, «Borrador» or «Aprobado», the total
in centavos (`Bs 4.030,00`), and a table of Concepto, Detalle, Monto. The
lines are Base (`Bs 3.500,00`), Clienta nueva (`Bs 50,00` or `Bs 80,00`),
and Bono (`Bs 400,00`) when the month's renewal rate reaches its target. A
draft has one **Aprobar** button. Approving creates the Salary Payment and
the card reads «Aprobado»; pressing again does nothing more. An empty month
says «Este mes no tiene un pago calculado.»

The Coordinator's sidebar does not show the row. Opening the address
returns her to Horario with «Esa sección es solo para administración.»

At 420 px the card stacks and the line table becomes labelled cards. The
sidebar opens from «Abrir menú».

Nothing else on `AW11` or on follow-up 202 changes. The Coordinator never
gets a «Mis pagos» row.
