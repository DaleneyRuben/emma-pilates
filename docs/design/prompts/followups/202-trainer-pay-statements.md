# Follow-up — Trainer pay statements and «Mis pagos»

Targets: **AW11 (Nómina)**, **S23 (Perfil, Staff)**. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by BKO-006 on 2026-10-23 from decisions section 8 and ADR-0105. The
canvas export was not run: this follow-up stays pending and the admin web
is built from this text. The Staff app was not walked.

## 1. AW11 gains a second page, not a tab

Nómina stays the hand-recorded Salary Payments it already is. A new sidebar
row **Pagos a instructoras**, directly above Nómina, opens a studio-wide
page of the same name. The subtitle reads «Todo el estudio · el cálculo
sale de las tarifas vigentes.» The top bar says the page is not filtered by
Branch.

A month stepper («Mes anterior», the month's name, «Mes siguiente») opens
on the current Bolivia month and does not step past it. The address keeps
`?month=YYYY-MM`. One button, **Calcular mes**, drafts the month. Each
Trainer with a line is a card: her name, «Borrador» or «Aprobado», the
total in centavos (`Bs 322,00`), and a table of Concepto, Detalle, Monto.
A draft has one **Aprobar** button. Approving creates the Salary Payment
and the card reads «Aprobado»; pressing again does nothing more. An empty
month says «Este mes no tiene pagos calculados.»

At 420 px the cards stack and the line table becomes labelled cards. The
sidebar opens from «Abrir menú».

## 2. S23 gains «Mis pagos» for a Trainer only

On the Trainer frame of `S23`, the menu group gains a row **Mis pagos**
above «Notificaciones». It opens a new screen of the same name: one card
per month, newest first, with the state, the total, and the lines. A
Trainer sees only her own. The Assistant, the Nutritionist, and
Administración do not get the row. The Coordinator, when her Role exists,
does not get it either.

Nothing else on `S23` or `AW11` changes.
