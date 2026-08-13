# Prompt 06 — Reschedule

Client mobile app. Chains from Prompt 05 (My Bookings) — reached by tapping "Reprogramar" on a Booking inside its Cancellation Window.

---

Using the Emma Pilates Studio design system (Prompt 00) and consistent with My Bookings (Prompt 05), design the **Reschedule** screen of the client mobile app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** bottom tab bar with "Mis Reservas" active; a back arrow in the header returns to My Bookings.

**Layout, top to bottom:**
1. Header: back arrow, title "Reprogramar clase".
2. A muted "current booking" summary card showing the Class Type, Trainer, and time being replaced, visually de-emphasized (lower-contrast, not a normal active card) since it's being moved, not the focus of the action.
3. A short explanatory note: "Puedes cambiar a otra clase disponible el mismo día."
4. A list of alternative Session cards, same visual style as Browse Sessions, filtered to **the same day only** and only Sessions with capacity — each showing time, Class Type, Trainer, and spots available. Tapping one selects it (visually highlighted with a Palo de rosa border).
5. A "Confirmar cambio" primary button fixed at the bottom, disabled until an alternative Session is selected.

If no alternative Sessions are available that day, show an empty state in place of the list: "No hay otras clases disponibles hoy." with the "Confirmar cambio" button hidden.

Generous whitespace, consistent with the rest of the app.
