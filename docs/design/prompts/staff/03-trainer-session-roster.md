# Prompt S03 — Session Roster (Trainer)

Staff app, Trainer role. Chains from Prompt S02 (My Schedule) — reached by tapping a Session card. Attendance can only be recorded once the Session has occurred, so this screen has two meaningfully different states.

---

Using the Emma Pilates Studio design system (Prompt 00) and consistent with My Schedule (Prompt S02), design the **Session Roster** screen of the staff app, as seen by a Trainer.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** none; a back arrow in the header returns to My Schedule.

**Layout, top to bottom:**
1. Header: back arrow, Class Type name as the title, with the Branch, date, and time range as a subtitle.
2. A vertical list of the Session's booked clients, one row per Booking, showing the client's name.

**Show two separate frames, since Attendance can only be set once the Session has ended:**
- **Antes de que termine la clase** — the roster is read-only (just names, no controls), with a note below the list: "Podrás marcar asistencia cuando termine la clase."
- **Después de la clase** — each client row gets a two-option segmented control, "Asistió" / "No asistió", unset by default (neither option pre-selected). A "Guardar asistencia" primary button (Palo de rosa fill) is fixed at the bottom.

Generous whitespace, consistent with the rest of the app.
