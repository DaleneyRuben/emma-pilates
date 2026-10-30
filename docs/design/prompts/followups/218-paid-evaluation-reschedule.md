# Follow-up — a confirmed paid Evaluation is rescheduled

Targets: **15 (Mis evaluaciones)**, its phone, Android, and tablet frames;
the **generated handoff `design/README.md`** (`15` inventory row). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by FIX-014 on 2026-10-29. Owner decision of that date: a paid
Evaluation whose payment is confirmed cannot be cancelled. The Client
reschedules it. An included Evaluation still cancels as `15` draws today.

## 1. The confirmed paid card

On a booked card whose Evaluation is paid and the payment is confirmed,
while the original turno is still more than 3 hours away:

- Replace the line «Puedes cancelar hasta 3 horas antes.» with «Puedes
  reprogramarla hasta 3 horas antes.»
- Replace the «Cancelar» action with «Reprogramar». It opens the same
  turno picker `13` uses, titled «Elige otro turno». The price line and
  the receipt control are absent: the payment stays with the Evaluation.
- Confirming a turno shows the card on the new date. The old turno is
  gone from the card.

## 2. What stays

An included Evaluation keeps «Cancelar» and the cancel sheet. A paid
Evaluation whose payment is still pending keeps the receipt upload and
«Cancelar». A card inside the 3 hours keeps «Ya no se puede cancelar».
