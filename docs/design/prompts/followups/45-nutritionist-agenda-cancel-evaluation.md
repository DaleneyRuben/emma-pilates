# Follow-up — Let the Nutritionist cancel an Evaluation from Mi agenda

Targets: **S15 (Mi agenda, Nutricionista)**. Send as a follow-up, alongside
checklist [30](./30-invariants-checklist.md).

---

The Nutritionist may cancel their own booked Evaluation at any time before it
starts, including inside the 3-hour window, and the Client is always notified
([`booking/CONTEXT.md`](../../../../booking/CONTEXT.md), *Evaluation*;
[NUT-001](../../../implementation/NUT-001-nutritionist-evaluation-schema-proposal.md)
D14). `S15` has no way to do it: the card only highlights
([26](./26-nutritionist-agenda-caption.md)).

- When a card is **selected** (highlighted), show one Error-toned text action
  under it: **"Cancelar evaluación"**. Unselected cards show no action, so the
  day list stays calm.
- Tapping it opens the same bottom sheet as `S14`, at the smaller scale:
  title "¿Cancelar esta evaluación?", the appointment in one line (day, time,
  Client), and the consequence **"Le avisaremos a [Nombre] y el horario
  quedará libre."** Actions: **Sí, cancelar evaluación** (Error tone, outlined)
  and **Volver** as tertiary text.
- Confirming closes the sheet and the card leaves the agenda, with a brief
  "Evaluación cancelada" notice strip under the header, like `S12`'s return.
- The "Primera evaluación" / "Seguimiento" label is derived: "Primera" when the
  Client has no earlier booked Evaluation, otherwise "Seguimiento". Keep it.

Update 26's "Sin detalle" note to: "La tarjeta se destaca al tocarla y muestra
«Cancelar evaluación»; no abre otra pantalla." Leave the day grouping, the
Hoy/Mañana labels, the hour-first card, the header controls, and the empty
state exactly as they are.
