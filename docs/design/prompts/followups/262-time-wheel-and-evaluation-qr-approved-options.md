# Follow-up — Verification findings 62 and 63: the approved options

Targets: **Staff S17** (new frame **S17b Hora de inicio**, the time sheet
open) and **Client C14** (new frame **C14b Confirmar evaluación pagada**)
and **C15** (new frame **C15c Subir comprobante**). Records the owner's
choice over [260](./260-availability-time-picker-proposals.md) and
[261](./261-paid-evaluation-qr-proposals.md). Send
[30](./30-invariants-checklist.md) alongside.

---

Written on 2026-11-15 for DES-016. The owner chose «A y A»
(relayed by the walkthrough session on 2026-11-15).

## 1. S17: the wheel (260 A)

«Hora de inicio» and «Hora de fin» open a white bottom sheet: the field's
name, the chosen time large (Lora 40 px, tabular), one line under it, two
wheel columns (hours; minutes 00, 15, 30, 45) five rows tall with the
chosen row in a Lino band, **Listo** (primary) and «Volver» (text).

- The line reads «Cada 15 minutos, de 6:00 a 22:00» for the start and the
  length plus turnos for the end («3 h · 4 turnos de 45 min»).
- The sheet opens on the field's time; an empty start opens on 9:00, an
  empty end one hour after the start.
- Hours and minutes the field cannot take are drawn `#D8C9BB` and do
  nothing: the start runs 6:00–21:15, the end from 45 minutes after the
  start to 22:00.
- A new start that leaves the end under 45 minutes later sends the end
  back to «Elegir».
- The grid of bordered cells and its checks are gone; follow-up 74's S17
  time sheet entry is replaced by this one.

S17b draws S17 Nuevo horario with the sheet open on «Hora de inicio», as
the 260 A prototype; S17 and S17 Editar horario are unchanged.

## 2. C14: the QR on a paid Evaluation (261 A)

When the Evaluation is paid, C14 reads, under the reminder and
cancellation rows: «1 · Paga con el QR del estudio» with C10's QR card
(«Escanéalo con tu app bancaria y transfiere Bs 70.», «Ampliar», «Guardar
QR»), then «2 · Sube tu comprobante» with the receipt row. The cost row
reads «Cuesta Bs 70 · se paga por transferencia». Above **Confirmar
evaluación**, C10's note: «Adjunta tu comprobante para continuar», then
«El estudio revisa tu pago y te avisa por la app» once attached. The free
case is C14 as exported. C14b draws the paid case.

## 3. C15: the QR on a later receipt (owner, 2026-11-15)

On a paid upcoming Evaluation still waiting for its receipt, «Sube tu
comprobante de transferencia» opens a sheet titled «Sube tu comprobante»
with the same two steps: «1 · Paga con el QR del estudio» (the QR card,
with the amount when the Evaluation carries it) and «2 · Sube tu
comprobante» with «Elegir comprobante», plus «Volver». Choosing a receipt
uploads it and closes the sheet; the card then says «Comprobante listo.».
C15c draws Mis evaluaciones with that sheet open.

## Preserve everything else

All other S17, C14 and C15 content, and every other screen.
