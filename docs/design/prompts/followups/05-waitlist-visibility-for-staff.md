# Follow-up — Show the Waitlist to trainers and admins, not just clients

Targets: **S03 (Lista de Asistentes, Entrenadora)**, **AW03 (Formulario de Sesión)**, and the cancel-session copy on **AW03** and **S14 (Cancelar Sesión, Administración)**. Send as a follow-up.

---

The client app shows Waitlist state clearly (`05 Mis Reservas`), but the two staff-facing screens that manage a Session's roster don't surface it at all, even though `booking/CONTEXT.md`'s Waitlist entry is core to how a full Session behaves:

1. **S03 — Lista de Asistentes**: below the confirmed-attendee list (the one the Trainer marks Attendance against), add a compact "En lista de espera" section listing queued clients in order, read-only (Trainers don't manage the queue, just see it) — client name + position, no attendance controls. Only show the section when the Session is at capacity and has a non-empty queue; omit it entirely otherwise.

2. **AW03 — Formulario de Sesión, Editar sesión frame**: near the "X de Y lugares reservados" line, add a small "N en lista de espera" note when the queue is non-empty, so an Administrator sees it before deciding whether to change the Trainer or cancel.

3. **Cancel-session copy fix (AW03 and S14)**: both screens currently say cancelling refunds every Booking and notifies each client, but say nothing about clients on the Waitlist. Per the Waitlist entry, a Session cancellation should also notify anyone still queued (their wait is over — nothing to promote them into). Add a line to the confirmation copy on both screens, e.g. "También se notificará a los N en lista de espera." — only when the queue is non-empty.

Nothing else on any of these three screens changes.
