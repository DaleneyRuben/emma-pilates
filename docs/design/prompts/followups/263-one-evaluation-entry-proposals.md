# Follow-up — Verification finding 70: one «Evaluación nutricional» entry (proposals)

Targets: **C13 Evaluación nutricional**, **C15 Mis evaluaciones** and their
Perfil rows in **C18**, merged into one screen, as proposals only, exported
to `design/v2/propuestas-evaluacion/`. Read with
[262](./262-time-wheel-and-evaluation-qr-approved-options.md) (C14b: a paid
Evaluation is confirmed with C10's two steps, QR card then receipt) and
[225](./225-visual-system-v2.md). Send [30](./30-invariants-checklist.md)
alongside. No exported screen is regenerated here: a later follow-up (264)
records what the owner chose.

---

Written on 2026-11-15 for DES-017 (walkthrough verification finding 70).

## Why

Perfil has two rows with near-identical names. «Evaluación nutricional»
(C13) books: the Nutritionist, the available days, the slots, then C14.
«Mis evaluaciones» (C15) lists the booked ones with their actions. After
**Confirmar evaluación** the app jumps to Mis evaluaciones. The owner asked
what the difference was and wants one entry, «Evaluación nutricional»: her
next Evaluation with its actions at the top, the slots to book below, and
the history at the foot.

## The rules every option keeps

From `booking/CONTEXT.md` (Evaluation) and the open findings on these
screens:

- Perfil keeps one row, «Evaluación nutricional»; «Mis evaluaciones» goes.
  Inicio's entry opens the same screen.
- After confirming, the app stays on this screen with the new Evaluation at
  the top and C15's toast: «Evaluación confirmada» for an included one,
  «Comprobante enviado» for a paid one, with the date and time.
- With nothing booked, the line under the title follows the Plan (finding
  69): «Tu primera evaluación del trimestre es gratis.», «Cuesta Bs 70 con
  tu plan de 12 clases.» or «Ya usaste la gratis de este trimestre: Bs 70.».
  The price comes from Studio Settings.
- A paid Evaluation is confirmed on C14b (follow-up 262): «1 · Paga con el
  QR del estudio», «2 · Sube tu comprobante», **Confirmar evaluación** on
  once the receipt is attached. The included one is C14 as exported.
- The next Evaluation's state reads (finding 64): «Gratis con tu plan»,
  «Pago en revisión» until the studio confirms the Payment, «Pagada» after.
- Actions: an included Evaluation shows «Cancelar evaluación» (free until
  3 hours before); a paid one cannot be cancelled and shows «Reprogramar»
  (until 3 hours before; the Payment stays with it). With the Payment in
  review, «Reprogramar» follows the rule finding 64 settles.
- When the studio cancels the slot (finding 68): «El estudio liberó tu
  turno», the Payment still valid, and **Elegir turno**, which moves the
  Evaluation to a new slot without paying again.
- Rescheduling and choosing a new slot use the slot grid on this screen;
  a sheet confirms «Antes» / «Ahora» with «Cambiar cita».
- Cancelling asks first in a sheet («¿Cancelar tu evaluación?»).
- «Anteriores» lists past Evaluations with C15's «Realizada» tag.

## The canvas

`Main.dc.html` names the options. One clickable board per option
(640 × 844: the 390 × 844 phone plus a «Ver el caso» list beside it) shows
Lucía with Gabriela, lunes 16 a las 9:00, in seven cases: sin reservar
gratis, sin reservar Bs 70, sin reservar con la gratis usada, reservada
gratis, pago en revisión, pagada, turno liberado. C18, C13, C13b, C14b,
C15, C15b and C15c are on the canvas unchanged as today's references.

### A · Tu cita arriba, en grande (recommended)

The next Evaluation is C14's Rosa Profundo hero (day eyebrow, the time in
Lora 40, «45 minutos · Gabriela · Achumani») with a state chip inside, one
muted line under it and full-width buttons below: **Reprogramar**
(secondary), «Cancelar evaluación» (outlined, Error text) or **Elegir
turno** (primary). A released slot draws the hero in Lino with the time
struck through. Then «Reserva otra evaluación» (or «Reserva tu evaluación»)
with the Plan line, the Nutritionist card, the day chips and the slots,
then «Anteriores».

### B · Tarjeta compacta y turnos a la vista

The title keeps the Plan line. The next Evaluation is C15's card (date
tile, «9:00 · Gabriela», a state pill, one muted line, text actions on the
right); the days and slots take most of the screen. It is the closest to
today.

### C · Una cosa a la vez

With an Evaluation booked, the screen centres on it: the hero carries a
three-step tracker (Reservada · Pago en revisión · Confirmada; for a
released slot, Reservada · El estudio liberó tu turno · Elige otro turno)
and its buttons. «Reservar otra evaluación» (with the Plan line) and
«Anteriores · 2» are folded rows that open on a tap. With nothing booked,
the slots show open.

## Preserve everything else

C14's free case, C14b, the reminder and cancellation rows, the problem
messages, C13b (no active Plan) and every other screen stay as exported.
