# Follow-up — Evaluation availability: months, Branch, and closing time

Targets: **13 (Evaluación nutricional)**. Send as a follow-up, alongside
checklist [30](./30-invariants-checklist.md).

---

`13` treats the monthly rule as a single on/off state: once the month is used,
the whole picker is replaced. The accepted rule is per **Bolivia calendar month
of the appointment**, and the 30-day horizon usually reaches into next month
([`booking/CONTEXT.md`](../../../../booking/CONTEXT.md), *Evaluation*;
[NUT-001](../../../implementation/NUT-001-nutritionist-evaluation-schema-proposal.md)
D8, D11). Change:

- **Omit days in a month already used** from the date picker, and keep days in
  an unused month. A Client who used September still sees October's days.
- The **"Ya usaste tu evaluación de este mes."** frame appears only when no
  unused month has open turnos in the next 30 days. Its supporting line names
  the next unused month: "Podrás agendar la de octubre desde el 1 de octubre."
  Keep it calm, sand-toned, and without a button.
- **Show the Branch per turno** when the open turnos span more than one Branch
  (a small "Centro" / "Urubó" caption under the day title or on the slot), and
  the Nutritionist's name per turno when more than one Nutritionist publishes.
  With one Branch and one Nutritionist the current header card stays as is.
- Turnos **disappear 3 hours before they start** (booking closes where free
  cancellation ends), so today's list may be shorter than the published block.
  Add the note "Puedes reservar hasta 3 horas antes." under the slot grid.
- A second frame for the **no active plan** state: "Necesitas un plan activo
  para reservar tu evaluación." with a "Ver planes" button to `08`. It is free
  but requires an active Subscription.

Leave the three-column slot grid, the header card with the Nutritionist, the
"horarios ocupados no se muestran" note, and the tab bar exactly as they are.
