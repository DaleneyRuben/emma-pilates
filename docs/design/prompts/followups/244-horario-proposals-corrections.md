# Follow-up — Corrections to the Horario proposals (243)

Targets: the proposal boards of [243](./243-horario-edit-panel-and-cancelled-classes.md)
in `design/v2/propuestas-horario/` (H1, H2, S1, S2, A1–C2). Read with 243.
Send [30](./30-invariants-checklist.md) alongside this follow-up. No other
board changes.

---

Written on 2026-11-05 for DES-009, after an independent review of 243's
boards. From here on, read 243 with these corrections.

## 1. One week, the same on every board

243 drew Thursday with two classes on the web and five on the Trainer's
agenda, and Friday 18:30 as standing on the web (the class the panel opens)
but cancelled by the studio on the agenda. From here on the week is:

- **Thursday 5** (today): Daniela Ortiz's five classes, all «Cancelada ·
  mínimo no alcanzado»: 08:00 Mat Pilates, 09:30 Reformer Pilates, 11:00
  Mat Pilates, 17:00 Mat Pilates, 18:30 Reformer Pilates.
- **Friday 6**: 07:00 Reformer Pilates (Daniela, 4 de 12), 08:00 Mat
  Pilates (Emma Vargas, 3 de 10), 09:30 Mat Pilates (Daniela, 2 de 10),
  **11:00 Mat Pilates (Daniela) «Cancelada por el estudio»**, 18:30
  Reformer Pilates (Daniela, 1 de 12, the class the panel opens), 20:00
  Reformer Pilates (Emma Vargas, 0 de 8).
- Monday to Wednesday and Saturday as 243 drew them.
- The subtitle reads «Sucursal Centro · 6 clases esta semana · 12
  canceladas · 1 en pausa».
- The agenda's Friday reads «Viernes 6 · 3 clases · 1 cancelada»: 07:00,
  09:30, the cancelled 11:00 and 18:30.

## 2. The read-only panels

- The Lugares row of a class cancelled for want of the minimum reads «1 de
  12 al cancelarse» (it had one booking against a minimum of 2); only the
  class cancelled by the studio reads «3 de 12 al cancelarse». 243 gave «3
  de 12» as the general example.
- A class of a paused series had no bookings (a pause only withdraws
  classes nobody booked), so its panel never says that clients got a class
  back; its Lugares row reads «0 de 12». «En pausa del 7 al 28 de
  noviembre» names the last paused Saturday, and «Vuelve sola el sábado 5
  de diciembre» the first class back.
- **Why `schedule_changed` stays hidden**, restated: those classes were
  withdrawn because the studio changed the series (a new series takes the
  slot) or ended it on purpose; both are planning, not cancellations the
  studio or the Trainer needs to read, and withdrawal only ever takes
  classes nobody booked. 243 gave only the first reason.

## 3. What is clickable

Only real actions are buttons. On every web board the class the panel
opens (Friday 18:30) and one cancelled class per cause (Thursday 18:30
«mínimo», Wednesday 18:00 «por el estudio», Saturday 10:00 «Serie en
pausa») are buttons that open their panels; every other class block is a
plain block, not a button, so a screen reader announces no dead
controls. Each board's «Prototipo» strip also has «Panel cerrado» (or
«Semana») to close the panel, which 243's state list left out.

## 4. Past days stay readable

243 kept 233's `opacity .55` on past days, which on a cancelled block
drops the cause pill to about 2:1 contrast. From here on a past day is
drawn without opacity: its day header and its blocks' text in Tenue
`#6F6662` (5.2:1 on Marfil), class names weight 500. The dashed border of
a cancelled block uses `#D8C9BB` instead of Arena `#E6DBD0`, so the
block's edge shows on Marfil.

## 5. Changes against the shipped panel, said plainly

The proposals, A most of all, change these against the panel the admin
web ships today; the code item must treat them as intended:

- «Terminar la serie» is today only in the «Esta y las futuras» footer;
  A and B show it always, in the «Serie semanal» row, next to «Pausar la
  serie» (C in its menu).
- The scope legend reads «Aplicar cambios a» (today «Aplicar el cambio
  a»), shown as a visible label.
- The cancel action and its confirmation use P02's copy, «Cancelar esta
  clase» and «¿Cancelar esta clase?» («Sí, cancelar la clase»), where the
  code says «Cancelar sesión».
- On a full class the small button reads «+ Lista de espera» (today
  «Agregar a la lista de espera», full width).

## Leave untouched

Everything else in 243: the three proposals and the recommendation, the
cause labels and colours, the agenda's card layout, the rail without the
«E».
