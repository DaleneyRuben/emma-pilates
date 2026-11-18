# Follow-up — Walkthrough finding 105: Dinero › Sueldos redesign (proposals)

Targets: **P06 Dinero › Sueldos › Por aprobar** (1440) and its 420 layout,
as proposals only, on a canvas of their own exported to
`design/v2/propuestas-sueldos/`. Read with
[225](./225-visual-system-v2.md), [233](./233-admin-web-pages-on-v2.md),
[202](./202-trainer-pay-statements.md) and
[224](./224-mis-pagos-and-salary-receipts.md). Send
[30](./30-invariants-checklist.md) alongside this follow-up. No exported
screen is regenerated here: a later follow-up records what the owner chose.

---

Written on 2026-11-18 for DES-022 and FIX-070 (walkthrough finding 105).

## Why

At Paso 15 D of the walkthrough the owner opened Sueldos for November:
Daniela Ortiz Bs 1.534,90 and Paula Vargas Bs 3.780. The amounts are right
(decisiones §8 and §9) but the page is not:

- **Aprobar** is a button as wide as the card, the biggest thing on the
  page, for the one action that moves money. The owner asked for a redesign.
- It approves on the first click, with no confirmation.
- In **Mes** for a month that has not ended it is offered anyway and fails
  with only «No pudimos aprobar el pago.» (the API answers 409
  `pay_statement_month_open`).
- The lines cannot be checked: 54 rows «Mínimo no alcanzado · Mínimo no
  alcanzado · Bs 25,00» with no date or time, «Clase · 1 alumnas» with no
  class, «Primer plan» commissions and the Coordinator's «Clienta nueva»
  lines with no Client.
- «1 alumnas».
- **Calcular** gives no sign that it recalculated.

## What every option keeps

- Dinero's page, rail, tabs and the period picker (Día, Semana, Rango, Mes,
  the stepper) and the «Por aprobar» / «Pagados» switch as they are.
- **Aprobar pago** is an ordinary small primary button, never full width,
  and always confirms first: «¿Aprobar Bs 1.534,90 a Daniela Ortiz por
  noviembre?», with the period, the number of lines and «Pago de sueldo con
  fecha de hoy», «Después de aprobarlo ya no cambia aunque vuelvas a
  calcular. Puedes subir el comprobante desde Pagados.», buttons «Cancelar»
  and «Aprobar Bs 1.534,90». After it: «Aprobamos Bs 1.534,90 a Daniela
  Ortiz. Quedó en Pagados con fecha …; ahí puedes subir el comprobante.» and
  the pill «Aprobado · 1 dic».
- A statement that cannot be approved yet shows no button but «Se aprueba
  desde el 1 de diciembre» (a Trainer: the day after the period ends) or
  «Se aprueba desde el 8 de diciembre» (the Coordinator: seven days later,
  since her bonus waits for renewals). In Mes of a month still open, one
  card above the list explains it: «Noviembre todavía no terminó: cierra
  el 30. Desde el 1 de diciembre puedes aprobar a las instructoras, y desde
  el 8 a la coordinadora, porque su bono espera las renovaciones. Para
  pagarle antes a una instructora, usa Rango hasta ayer.» with **Pagar por
  Rango**, which switches to Rango from the 1st to yesterday. Rango never
  lists the Coordinator.
- Lines are grouped by concept, in the staff app's order (S29): «Clases
  dictadas», «Canceladas por mínimo», «Comisiones de primer plan», «Base»,
  «Clientas nuevas», «Bono de renovación», each with its count × rate and
  its subtotal («54 × Bs 25,00 · Bs 1.350,00»), then the total.
- Each group opens to one row per class or Client:
  - a class or a class cancelled for the minimum: date, time, Branch, class
    type, and for a taught class its bookings («Reformer · 1 alumna»);
  - a first-plan commission: the Client, the day her first Plan was
    approved, the Plan, «10 % de Bs 480», the amount;
  - a new Client of the Coordinator: the Client, the day, the Plan, its
    length («30 días»), the amount.
  The button says what opens: «Ver las 54», «Ver la clase», «Ver las 2
  clientas»; open, «Ocultar». A long group scrolls inside its box.
- «1 alumna», «2 alumnas».
- **Volver a calcular** shows «Calculando…» while it runs, then «Recalculamos
  noviembre a las 14:32. Cambió 1 sueldo: Daniela Ortiz pasó de Bs 1.509,90
  a Bs 1.534,90 …» or that nothing changed.

## The canvas

`Main.dc.html` states the three options (A recommended). Each option has a
clickable board at 1440 and one at 420. A dark strip at the top of each
board is the prototype's control and not part of the design; its chips jump
to «Hoy (18/11, mes abierto)», «1 de diciembre», «Detalle abierto»,
«Confirmar», «Aprobado» and «Recalculado»; the page's own buttons work too.

1. **A · Resumen que se despliega** (recommended). One card per person, full
   width: avatar, name, role and line count, the state pill, the total and
   at the right **Aprobar pago** (or the wait note). Below, one row per
   concept (name and «Ver las 54», count × rate, subtotal); the detail opens
   in place as a table (Fecha, Hora, Sucursal, Clase, Monto) at 1440 and as
   two-line rows at 420.
2. **B · Lista y panel de revisión**. A short table: Persona, Rol, Estado,
   Total, **Revisar**. Revisar opens a 600 px panel on the right with the
   concepts and their detail; **Aprobar pago** lives only at the panel's
   foot beside «Total a pagar», so nobody approves without opening the
   detail. At 420 the panel takes the screen.
3. **C · Tarjetas y revisión antes de aprobar**. Compact cards in two
   columns with the concepts summed. **Revisar y aprobar** (or «Revisar»
   while it waits) opens a dialog with one tab per concept, the detail and
   «Total a pagar» with **Aprobar pago** at its foot. At 420 the cards stack
   and the dialog is a sheet.

## Keep

«Pagados», Nómina (AW11), the staff app's «Mis pagos» (S29); the brand,
colours and type of 225. The amounts and their rules do not change.
