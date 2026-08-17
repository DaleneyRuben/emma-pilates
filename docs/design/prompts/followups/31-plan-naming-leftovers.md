# Follow-up — Two leftovers from the plan rule, and a correction to the invariants list

Targets: **Sistema de Diseño (Prompt 00)** and **AW34 (Selector de sucursal, Web Admin)**. Send as a follow-up on each surface, alongside [30](./30-invariants-checklist.md) as always.

---

The last export satisfies almost the whole invariants list: the `S06` and `AW08` links are back, so is `AW03`'s waitlist copy and `09`'s validity and payment-method lines, and "Mensual libre" is gone from the entire admin web. Two leftovers remain from the same point 1 of the list, plus one thing the list itself states incorrectly.

## 1. `Sistema de Diseño` — the plan card says "sesiones"

In the client plan card sample — the one for "Lucía Mendoza · Paquete de 8 · vence el 30 de agosto" — the progress line reads **"5 de 8 sesiones usadas"**. It must read **"5 de 8 clases usadas"**.

What a client consumes from her plan is a **clase**. "Sesión" is the class scheduled in the studio's timetable, which is a different thing: a session is taught by one trainer and booked by several clients. The card is about the client's balance, so it counts classes. The rest of the card — name, initials, plan, expiry, the 63 % and the bar — stays as it is.

## 2. `AW34` — a plan that doesn't exist in the sample data

The frame showing the selector open over Pagos has two rows reading **"Paquete de 4 clases · Bs 320"**. That plan doesn't exist. The full catalogue is:

| Plan | Price |
|---|---|
| Paquete de 8 clases | Bs 560 |
| Paquete de 12 clases | Bs 780 |
| Mensual 16 clases | Bs 1.050 |
| Trimestral 36 clases | Bs 2.100 |
| Semestral 90 clases | Bs 5.400 |
| Anual 180 clases | Bs 9.600 |

Change the two rows for Valentina Arce and Sofía Chávez to **"Paquete de 12 clases · Bs 780"**, which doesn't yet appear in that frame, so all three rows show different plans. The plan and the amount must always match this table: if you change one, change the other.

The frame's other rows are already correct ("Paquete de 8 clases · Bs 560" and "Mensual 16 clases · Bs 1.050") and stay untouched, as does the rest of `AW34`: the four frames, the four branches with their addresses, the active-branch marking, "Gestionar sucursales", the no-branch-scope note and the note about `AW16`.

## 3. Correction to point 8 of the invariants list

The list says `19` (Notificaciones, client) has **seven** notification types. **There are six**, and there always were: rejected receipt, cancelled class, payment confirmed, plan about to expire, and the two nutritional-evaluation reminders (tomorrow and in 1 hour). The screen already says it correctly — "Los seis tipos de aviso que envía la app" — and the corrected number is the right one; it was the list's text that was wrong.

From here on, read **six** in point 8 of the list, not seven. What does still hold is that **rejected receipt** is one of those six and goes in red alongside cancelled class.

And one rule that point 1 was missing, so the `AW34` case doesn't recur: **the six plans in the table are the only ones that exist.** Don't invent others to fill sample data — no "Paquete de 4 clases", no "Clase suelta", no name outside the table. If a sample row needs a plan, pick one of the six.

---

Nothing else changes on either screen, and nothing changes elsewhere: everything the invariants list currently holds true — the sidebar, the 2 h 30 window, the payment methods, the waitlist, the account avatars, the `S06` and `AW08` links, the enlarged receipt, the feminine counters — stays exactly as it is.
