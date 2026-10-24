# Follow-up — `AW22` gains «Acceso de prueba» (REL-011)

Targets: **AW22 Detalle de cliente** (the panel footer and one new dialog with
its states). Send [30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by REL-011 on 2026-10-23. Google approves the Client app only after a
closed test: at least 12 testers register on production with their own email
and book classes for 14 days without paying. The owner decided that only the
Administrator gives them classes, through **Courtesy Access**
(`booking/CONTEXT.md`, booking ADR-0012): a hidden Plan «Acceso de prueba» of
16 classes at Bs 0, valid until a date she chooses. The same grant serves the
stores' review Accounts. Assistants never see it, and no Client can buy it.
Production is reset after Google's approval (ADR-0104), so nothing marks the
testers apart.

## 1. `AW22` — A second footer action

- The footer gains a compact neutral outline button **Acceso de prueba**,
  left of **Cerrar cuenta** (wrapping above it at the narrow width).
- It appears only while the Client has no active Plan (the Plan block reads
  «Sin plan activo», with or without the «Expirado» pill) and the Account is
  not deactivated. With an active Plan the footer shows **Cerrar cuenta**
  alone, as today.

## 2. `AW22` — The dialog

**Acceso de prueba** opens the standard confirmation in the primary tone (as
confirming a Payment on `AW29`, follow-up 53/55 convention):

- Title «¿Dar acceso de prueba a Valeria Terceros?»
- Body: «Recibe el plan «Acceso de prueba»: 16 clases sin costo, desde hoy
  hasta la fecha que elijas. Es para las testers de la prueba cerrada y las
  cuentas de revisión de las tiendas; no cuenta como ingreso.»
- One date field, label «Válido hasta», the standard date input, prefilled
  30 days from today, no earlier than today and no later than one year ahead.
- Buttons **Volver** (compact neutral) and **Dar acceso** (primary). **Dar
  acceso** is grey while the date is empty or out of range.
- Draw the dialog open with the date «22/11/2026».

## 3. `AW22` — After confirming

- **Done:** the dialog closes and the panel stays open. The Plan block now
  reads «Acceso de prueba» with the Éxito «Activo» pill, «Vigencia» from today
  to the chosen date, and «Clases disponibles» «16 de 16». An Éxito line sits
  above the footer buttons: «Acceso de prueba activo hasta el 22/11/2026.»
  (the design system's `dd/mm/aaaa`).
  The **Acceso de prueba** button disappears, because she now has an active
  Plan. Draw this frame.
- **Refused:** the dialog stays open with an Error notice above its buttons,
  one of:
  - «Ya tiene un plan en uso. Puedes darle acceso de prueba cuando termine.»
  - «Tiene un pago por transferencia en revisión. Confírmalo o recházalo en
    Pagos y vuelve a intentarlo.» with the text link **Ir a Pagos** (to
    `AW28`).
  - «Tiene una compra por transferencia sin terminar. Vuelve a intentarlo
    cuando venza.»
  - «Elige una fecha entre hoy y un año desde hoy.»
  Draw the transfer-in-review notice.
- **Failed:** a network failure keeps the dialog open with «No pudimos dar el
  acceso. Inténtalo de nuevo.» in the same place.

## Preserve everything else

Do not change the panel's header, contact, plan, crédito, and referidos
blocks (beyond the Plan block's values after a grant), the pending and
deactivated boxes, the «Cerrar cuenta» button and its dialogs, the shell, the
sidebar, the Branch selector, the closed palette, or any screen not named in
Targets. The tester Plan never appears on `AW08` (Planes) for anyone but the
Administrator, where it is already listed as hidden, nor on any Client or
Staff screen.
