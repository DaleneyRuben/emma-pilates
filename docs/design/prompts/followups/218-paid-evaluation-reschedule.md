# Follow-up — a confirmed paid Evaluation is rescheduled

Targets: **15 (Mis evaluaciones)** and **13 (Evaluación nutricional)**,
their phone frames (both files draw iOS frames only); the **generated
handoff `design/README.md`** (`13` and `15` inventory rows). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by FIX-014 on 2026-10-29. Owner decision of that date: a paid
Evaluation whose payment is confirmed cannot be cancelled. The Client
reschedules it. An included Evaluation still cancels as `15` draws today.

Corrected before it was sent (2026-10-29, after the FIX-014 device walk):
sections 3 and 4 are new. They cover what the walk showed. The picker
kept the booking copy «Reserva tu evaluación gratuita…», and a single tap
on a time moved the Evaluation with no confirmation.

## 1. The confirmed paid card

On a booked card whose Evaluation is paid and the payment is confirmed,
while the original turno is still more than 3 hours away:

- Replace the line «Puedes cancelar hasta 3 horas antes.» with «Puedes
  reprogramarla hasta 3 horas antes.»
- Replace the «Cancelar» action with «Reprogramar». It is not destructive,
  so it uses the text-action tone (`#8A5D59`), not the cancel tone. It
  opens the same turno picker `13` uses, titled «Elige otro turno» (§3).
  The price line and the receipt control are absent: the payment stays
  with the Evaluation.
- Confirming a turno (§4) shows the card on the new date. The old turno
  is gone from the card.

Draw this as a new `15` frame, «iOS · Pagada y confirmada». Keep the
existing frames as they are.

## 2. What stays

An included Evaluation keeps «Cancelar» and the cancel sheet. A paid
Evaluation whose payment is still pending keeps the receipt upload and
«Cancelar». A card inside the 3 hours keeps «Ya no se puede cancelar».

## 3. «Elige otro turno» (`13` in reschedule mode)

Draw a new `13` frame, «iOS · Elige otro turno», from «Con disponibilidad»:

- The header reads «Elige otro turno».
- The intro line «Reserva tu evaluación gratuita con la nutricionista.
  Tienes una evaluación disponible por mes.» becomes «Tu evaluación ya
  está pagada. Elige el nuevo horario: el pago se mantiene.». The
  nutritionist card stays.
- The Client's current turno is not offered. For example, with her
  Evaluation on Thursday 3 September at 16:00, that day lists the other
  times only.
- The footnote «Al elegir uno confirmarás la cita en la siguiente
  pantalla.» becomes «Al elegir un horario te pediremos confirmar el
  cambio.», and «Puedes reservar hasta 3 horas antes.» becomes «Puedes
  reprogramarla hasta 3 horas antes.».
- No price, no receipt control, and no plan line anywhere on the frame.

## 4. Confirming the move

Tapping a time opens a bottom sheet over the dimmed picker. It is the same
sheet pattern as `15`'s cancel sheet: no new screen. Draw it as a second
new `13` frame, «iOS · Confirmar el cambio».

- Title: «¿Mover tu evaluación?»
- Two lines with the old and the new turno: «Antes: jueves 3 de
  septiembre, 16:00» and «Ahora: lunes 7 de septiembre, 10:00», then
  «45 min · Carla Peña».
- Consequences: «El pago se mantiene: no pagas de nuevo.» and «El horario
  anterior queda libre para otras clientas.»
- Actions: «Sí, mover evaluación» as the primary filled button (Palo de
  rosa), and «Volver» as the text action under it. «Volver» closes the
  sheet and leaves the picker as it was.
- After the move, the Client lands on `15` with the card on the new date
  and the same passing notice pattern `15` uses after a booking:
  «Evaluación reprogramada».
