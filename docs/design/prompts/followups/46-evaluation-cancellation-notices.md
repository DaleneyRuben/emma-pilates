# Follow-up — Add the Evaluation cancellation notices to both inboxes

Targets: **19 (Notificaciones, cliente)** and **S20 (Notificaciones,
staff)**. Send as a follow-up, alongside checklist
[30](./30-invariants-checklist.md).

---

The Evaluation journeys now send two cancellation notices that neither inbox
shows ([NUT-001](../../../implementation/NUT-001-nutritionist-evaluation-schema-proposal.md)
D14; [45](./45-nutritionist-agenda-cancel-evaluation.md)):

- **On `19`**, add one entry, Evaluation cancelled by the studio:
  "El estudio canceló tu evaluación nutricional del lunes 28 de septiembre,
  09:45. Ya puedes reservar otra este mes." Tapping it opens `15`. Keep the
  existing reminder entries' wording as the built app sends it: "Recordatorio:
  tu evaluación nutricional es mañana a las 09:45." and "…es en una hora, a
  las 09:45."
- **On `S20`**, the Nutritionist card set gains a second entry, Evaluation
  cancelled by the Client: "Valeria Áñez canceló su evaluación del lunes 28 de
  septiembre, 09:45." Its sibling, "Nueva evaluación agendada: …, con Paola
  Suárez.", stays. Both open `S15`.

Checklist 30 §8 counts the notification types per inbox; add these two to the
count rather than replacing any existing sample. Nothing else changes: icons,
unread tint and dot, relative timestamps, and the empty states.
