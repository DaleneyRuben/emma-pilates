# Prompt 05 — My Bookings

Client mobile app. Reached via the "Mis Reservas" tab, accessible from anywhere in the app — references Prompt 00 (design system) for style. Prompt 06 (Reschedule) chains from this one; Class History is a related, separately-prompted screen (Prompt 07).

---

Using the Emma Pilates Studio design system (Prompt 00), design the **My Bookings** screen of the client mobile app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** bottom tab bar with "Mis Reservas" active.

**Layout, top to bottom:**
1. Screen title "Mis reservas", with a small text link "Ver historial" in the top-right corner (to Class History, Prompt 07).
2. A vertical list of upcoming Booking cards, ordered by date/time, each showing: Class Type name, Trainer name, Branch, date, and time range.
3. Each card carries a status badge and a matching action, depending on state:
   - **Confirmada, outside the Cancellation Window** (more than 2.5 hours before start) — no badge needed (this is the default state); action button "Cancelar".
   - **Confirmada, inside the Cancellation Window** (within 2.5 hours of start) — small warning-colored badge "No cancelable"; action button "Reprogramar" instead of Cancel, since cancellation is no longer available this close to start.
   - **En lista de espera** (waitlisted, not yet promoted to a confirmed spot) — warning-colored badge "En lista de espera"; action button "Salir de la lista de espera".

Show all three card states in the list together, as if a real client had a mix of them, so the visual distinction between states is clear side by side.

If there are no upcoming Bookings, show an empty state: a friendly illustration area, "Aún no tienes reservas próximas." and a "Reservar una clase" button linking to Browse Sessions.

Generous whitespace, soft-rounded cards per the design system.
