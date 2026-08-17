# Follow-up — Acknowledge a new reserva on Mis reservas (cliente)

Targets: **05 (Mis reservas)**. Send as a follow-up.

---

Booking a class is the one commitment in the client app that completes in silence. `04`'s **Reservar** consumes an allowance unit (`booking/CONTEXT.md`, *Booking*) and drops the client into `05` with no acknowledgement that anything happened — they have to find their own booking in the list and infer that it worked. Every comparable moment in the product does say so: `11` has a full "¡Pago confirmado!" state, `S10` answers a cash payment with "¡Pago registrado!", `S12` returns to the list with a brief notice, and `S14` draws a result state for a cancelled session.

Add a frame **iOS · Recién reservada** to `05`, showing the state the client lands in immediately after confirming on `04`:

- A brief notice strip pinned under the "Mis reservas" header, above the first day group: Éxito tint background (`#7C9473` at 14 %), a check glyph in the full Éxito colour, and the line "Reserva confirmada" with the class, day and time beneath it in the Nota style.
- The strip is transient — it fades out after a few seconds or on the first scroll, and never appears again for that booking. It is not a status the row carries; it is feedback about the action just taken.
- The newly created card carries a matching Éxito-toned left edge for as long as the strip is visible, so the eye can find it in a list that may already hold several bookings, then settles into a normal card.
- Below the strip, the class balance the booking just changed, in one muted line — "Te quedan 7 clases en tu plan" — closing the loop on the "Se descontará 1 clase de tu paquete" promise `04` makes before the tap.
- No solid button, no dismiss control: the notice is not a task.

Draw the same state in the **Android** frame with Material density.

Do the same for an evaluation confirmed on `14`, which has the identical silence: it returns the client to their appointment with nothing said. Route that to the same notice pattern on `15` — "Evaluación confirmada", the day and time beneath it — but with no class-balance line, since an Evaluation "costs no money and consumes no class allowance".

Nothing else changes on either screen: the day grouping, the three card states on `05`, the cancellation-window copy, "Ver historial", and both empty states stay exactly as they are. This state is additive — the default frames still show `05` and `15` arrived at normally, with no notice.
