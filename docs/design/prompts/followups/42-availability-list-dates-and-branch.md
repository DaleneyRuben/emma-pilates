# Follow-up — Show start/end dates and the Branch on Mi disponibilidad

Targets: **S16 (Mi disponibilidad, Nutricionista)**. Send as a follow-up,
alongside checklist [30](./30-invariants-checklist.md).

---

Since `S17` now applies every change from a chosen date
([41](./41-availability-form-effective-date-and-branch.md)), a block can start
or end in the future, and a Nutritionist assigned to two Branches can publish
at both ([NUT-001](../../../implementation/NUT-001-nutritionist-evaluation-schema-proposal.md)
D3, D6). `S16`'s cards show only the weekday and range, so two cards for the
same day look identical.

On each Availability Block card:

- Add a quiet date line when the block does not simply run from the past
  indefinitely: **"Desde el lunes 5 de octubre"** for a block that starts in
  the future, **"Hasta el viernes 30 de octubre"** for one that ends, or both
  ("5 – 30 de octubre"). A block already in effect with no end shows no date
  line.
- Add the Branch name ("Sucursal Centro") to the detail line **only when the
  Nutritionist's blocks span more than one Branch**.
- Keep the "N cupos de 45 min · M reservados" detail.

Draw the list with four cards, one of them starting next week and one at a
second Branch. Nothing else changes: weekday ordering (lunes a domingo), the
single solid "Nuevo horario", the empty state, and the tap-to-edit behaviour.
