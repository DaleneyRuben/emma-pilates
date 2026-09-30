# Follow-up — The Assistant manages a pending invitation from `S06`, as built

Targets: **Staff `S05`, `S06`**. Send [30](./30-invariants-checklist.md) alongside this follow-up. It corrects where [35](./35-email-activation-instead-of-temporary-passwords.md) and [38](./38-authentication-email-throttling.md) put the pending state (both already applied; a sent follow-up is never edited).

---

Follow-up 35 drew the pending invitation on `S05`, right after «Crear cuenta». The staff app (MOB-004/IDN-005) instead opens `S06` Resumen del cliente after the invitation is sent, and keeps the pending box there. The decision (2026-09-30) is to keep the built behavior: an Assistant who later finds a pending Client through `S04` lands on `S06`, so that is the only place the invitation can be managed on every visit, not only right after creating it.

## 1. `S05` stays a form

- Remove the pending frames from `S05`: «Invitación enviada», «Cambiar correo», «Cancelar invitación», «Reenvío limitado», and «Ya estaba pendiente».
- After a successful «Crear cuenta», `S05` opens `S06` for the new Client.
- Keep on `S05`: the form (Nombre, Correo electrónico, Teléfono (opcional), the 7-day activation note), the Android and tablet frames, the self-registered «Verificación pendiente» frame, and the «Correo de otra cuenta» conflict.
- When the same email reopens a pending Client in the same creation flow, `S05` opens that Client's `S06` with the notice below.

## 2. `S06` gains the pending box

Near the top of `S06`, only while the Client's Account is pending activation, draw one card, using the shipped copy:

- **«Cuenta pendiente de activación»**, the email, and a **«Cambiar correo»** action. Correcting the email shows the field «Nuevo correo» with «Guardar correo» and «Cancelar». On success it shows «Enviamos el enlace de activación al nuevo correo.»
- **«El enlace de activación vence el {fecha}.»** and **«La invitación se elimina a los 30 días sin activación, cambio de correo o reenvío.»** Keep these two lines visibly separate.
- **«Reenviar enlace»**. On success it shows «Enviamos un nuevo enlace de activación.» When the server limits the resend, show «Ya enviamos un correo a esa dirección hace poco.» with the server-provided wait, and keep the current link valid.
- A quiet **«Cancelar invitación»** that opens a sheet with «¿Cancelar la invitación de {nombre}?», «Se anularán los enlaces enviados, se liberará el correo y la cuenta pendiente desaparecerá.», «Sí, cancelar invitación», and «Volver». Confirming returns to `S04`. If the Client already has payments or bookings, show «La cuenta ya tiene pagos o reservas, así que la invitación se mantiene.» instead.
- The notice when the same email reopened the invitation: «{nombre} ya estaba pendiente de activación. Le enviamos un enlace nuevo y conservamos sus datos.»

The rest of `S06` (plan, bookings entry «Ver reservas» → `S21`, history «ver todo» / «Ver historial completo» → `S22`, checklist 30 §6) stays exactly as drawn. The card disappears once the Client activates.
