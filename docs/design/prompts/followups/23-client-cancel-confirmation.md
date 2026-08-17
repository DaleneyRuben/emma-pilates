# Follow-up — Confirm before cancelling a reserva or an evaluación (cliente)

Targets: **05 (Mis reservas)** and **15 (Mis evaluaciones)**. Send as a follow-up.

---

`05`'s own notes already specify this and the screen doesn't deliver it: under "Estado → acción" it reads *"Confirmada, fuera de la ventana … Acción: «Cancelar», con confirmación previa"*. There is no confirmation anywhere in the client app — the button cancels outright. `15` has the same text-link **Cancelar** on the upcoming evaluation, with the same absence.

Both are irreversible. Per `booking/CONTEXT.md`, a cancelled Booking cannot be un-cancelled — the client gets their allowance unit back and has to book again, and if the Session has filled in the meantime the spot is gone. A cancelled Evaluation's slot "becomes bookable again" to everyone, and the client is capped at one Evaluation per calendar month. The staff app already treats cancellation this way: `S14` puts the consequences above the buttons, colours the destructive action with the Error tone and keeps the way out tertiary. The client app should follow that same rule, at the client's smaller scale.

Add a **confirmation sheet** to both screens — a bottom sheet over the dimmed list (`rgba(74,58,48,0.22)`), white, top corners radius 16, not a new screen: the client is confirming one row they can already see, so pushing them out of the list would be heavier than the decision warrants.

**On `05`**, add a frame **iOS · Confirmar cancelación**:
- Title "¿Cancelar esta reserva?" in the Título 2 style.
- Beneath it, the booking being cancelled in one quiet line — class type, day and time, trainer, branch — so there is no doubt which of the three cards is about to go.
- One consequence line, plainly: the class returns to the plan's balance and the spot is released, and re-booking depends on there still being room.
- Actions stacked: **Sí, cancelar reserva** (Error tone, outlined — not a solid fill; nothing on this screen is solid) and **Volver** as a tertiary text action below it, per the `S14` hierarchy.
- Confirming closes the sheet and returns to the list with that card gone. No result screen — the same restraint `S12` states for payments.

**On `15`**, add the equivalent sheet: "¿Cancelar esta evaluación?", the appointment line (day, time, nutritionist), and the consequence that the slot is released and becomes bookable by other clients. **Do not** write a line about whether the monthly quota comes back — the glossary doesn't settle it and `13`/`14` say only that booking uses the month's slot. Leave that sentence out entirely rather than guess it.

Only the cards outside the Cancellation Window get this sheet. The "No cancelable" card on `05` still offers **Reprogramar** with no confirmation — rescheduling moves an already-consumed unit and loses nothing — and **Salir de la lista** on the waitlist card stays as it is, since joining a waitlist consumes no allowance.

Nothing else changes on either screen: the day grouping, the three card states, the "Ver historial" link, the empty states, and `15`'s "Anteriores" rows all stay as they are.
