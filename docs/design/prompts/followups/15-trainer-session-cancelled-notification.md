# Follow-up — Tell the Trainer when her session is cancelled

Targets: **S20 (Notificaciones, Staff)**. Send as a follow-up.

---

S20 documents four notification types — sesión asignada (Entrenadora), comprobante pendiente (Administración), evaluación agendada (Nutrición), pago en efectivo confirmado (Asistente) — but none of them covers a Session disappearing from a Trainer's agenda, which `booking/CONTEXT.md`'s Session entry says happens in two ways:

- **Automatically**: the system checks once, 2 hours before start, and cancels the Session if it has zero Bookings at that moment.
- **By an Administrator**: as a last resort when no substitute Trainer can cover it (the flow in `S13`/`S14`).

Either way the Trainer needs to be told, or she shows up for a class that no longer exists. Add a fifth entry to the list, in the Entrenadora role:

- Auto-cancellation copy along the lines of "Tu clase de Mat Pilates de hoy 07:00 se canceló: no tuvo reservas." — icon in the **arena** tone, since it reports the agenda without asking for anything (per this screen's own colour rule: ámbar pide acción, verde confirma, arena es agenda sin estado).

Tapping it opens Mi agenda (`S02`), same as the sesión asignada notification.

Keep the screen's existing framing: the types are shown together here only as documentation, each with its role label, and a real account only sees the ones for its own role. Update the note that says "los cuatro tipos" to match the new count. Nothing else on the screen changes, and the empty state stays as it is.
