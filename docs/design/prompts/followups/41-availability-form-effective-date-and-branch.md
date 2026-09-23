# Follow-up — Add the effective date and Branch picker to the Availability Block form

Targets: **S17 (Formulario de horario, Nutricionista)**. Send as a follow-up,
alongside checklist [30](./30-invariants-checklist.md).

---

`S17` draws only Día, Hora de inicio, and Hora de fin. The accepted rules need
two more inputs and a clearer edit/delete confirmation
([`booking/CONTEXT.md`](../../../../booking/CONTEXT.md), *Availability Block*;
[ADR-0059](../../../adr/0059-materialize-recurring-schedules.md);
[NUT-001](../../../implementation/NUT-001-nutritionist-evaluation-schema-proposal.md)
D3, D6):

- **A partir del** — a date field below Horario, defaulting to today and never
  allowing an earlier date. Creating, editing, and removing a block all take
  effect from this date: only unbooked future turnos from that day on change.
  On **Nuevo horario** it reads "A partir del"; on **Editar horario** the same
  field is labelled "Aplicar cambios desde". The "Eliminar horario" action uses
  the same date ("Quitar desde el …").
- **Sucursal** — a pill row like Día, shown **only when the Nutritionist is
  assigned to more than one Branch**; with a single Branch it is omitted and
  that Branch is used. Draw one frame with two Branches ("Centro", "Urubó").
- **Edit and delete confirmation** — when the block already has booked
  Evaluations, "Guardar" on Editar horario and "Eliminar horario" both open a
  bottom sheet in the `S14` hierarchy: title "¿Aplicar el cambio?" or
  "¿Quitar este horario?", one line naming the date it applies from, and the
  consequence **"Las N evaluaciones ya reservadas se mantienen."** Actions:
  the primary (Palo de rosa for Guardar, Error tone outlined for Quitar) and
  **Volver** as tertiary text. Without booked Evaluations, save directly.
- Hours stay on the **15-minute grid** (9:00, 9:15, 9:30 …) and the range must
  hold at least one 45-minute turno; the preview line keeps its "N turnos de
  45 min" count.

Leave everything else as it is: the pill-based Día selector, the automatic
turnos note, the disabled "Guardar" until the form is complete, the Error-toned
"Eliminar horario" text link at the end, and the Android frame.
