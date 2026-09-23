# Follow-up — Mis evaluaciones: two upcoming cards, the freed month, and the 3-hour limit

Targets: **15 (Mis evaluaciones)**. Send as a follow-up, alongside checklist
[30](./30-invariants-checklist.md).

---

Three things on `15` contradict the accepted rules
([`booking/CONTEXT.md`](../../../../booking/CONTEXT.md), *Evaluation*;
[NUT-001](../../../implementation/NUT-001-nutritionist-evaluation-schema-proposal.md)
D8, D9, D12):

- The frame caption and notes say "como máximo hay una evaluación al mes" /
  "como mucho hay una a la vez". A Client can hold **one per month**, so two
  upcoming cards can exist across a month boundary (e.g. 28 de septiembre and
  3 de octubre). Drop "como máximo una" and draw one frame with two
  "Próximas" cards.
- [23](./23-client-cancel-confirmation.md) deliberately left the freed-month
  sentence out of the cancel sheet. It is now settled: **a cancelled
  Evaluation frees its month.** Add a second consequence line to the sheet:
  "Podrás reservar otra evaluación para este mes."
- **Inside 3 hours of the start** the card can no longer be cancelled. Replace
  its **Cancelar** text action with a muted line, "Ya no se puede cancelar",
  and draw that card state. The existing line "Puedes cancelar hasta 3 horas
  antes." stays on cards outside the window.
- "Realizada" on Anteriores is derived from time (the appointment ended); it
  has no attendance meaning. Keep the label; add nothing like "No asistió".
- A studio-cancelled Evaluation is not listed under Próximas; it simply leaves
  the list (the Client learns it from `19`).

Nothing else changes: the transient "Evaluación confirmada" notice, the
bottom-sheet pattern, the empty state with "Reservar evaluación", and the
Anteriores rows.
