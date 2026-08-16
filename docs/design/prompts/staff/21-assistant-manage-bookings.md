# Prompt S21 — Reservas de la clienta (Assistant)

Staff app, Assistant role. Chains from Prompt S06 (Client Overview) — reached by tapping "Ver reservas" (see Follow-up 06, which adds that entry point to S06). Prompt S08 (Session Detail) and a Reschedule step chain from this one, mirroring the client app.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same structure as the client app's My Bookings screen (Prompt 05), design the **Reservas de la clienta** screen of the staff app, as seen by an Assistant managing a selected client's upcoming Bookings on their behalf.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Responsive:** phone gets the full-width single-column layout described below; tablet keeps this as the right-hand detail panel next to Client Search, same split as Client Overview (Prompt S06).

**Navigation chrome:** a back arrow in the header returns to Client Overview. A persistent banner below the header reads "Viendo reservas de: [Nombre del cliente]".

**Layout, top to bottom:**
1. Header: back arrow, title "Reservas de la clienta".
2. "Viendo reservas de: [Nombre del cliente]" banner.
3. A vertical list of the client's upcoming Booking cards, identical structure and states to the client app's My Bookings (Prompt 05): Confirmada (outside the Cancellation Window, action "Cancelar"), No cancelable (inside the window, action "Reprogramar"), En lista de espera (action "Salir de la lista de espera"). Show all three states together.

Cancelling asks for confirmation first ("¿Cancelar esta reserva de [Nombre del cliente]?"), same as the client app would ask the client themselves. Tapping "Reprogramar" opens the same same-day-alternatives flow as the client app's Reschedule screen (Prompt 06), staff-styled with the "Viendo reservas de:" banner persisting.

If the client has no upcoming Bookings, show an empty state: "Esta clienta no tiene reservas próximas." with a "Reservar una clase" button linking to Browse Sessions (Prompt S07).

Generous whitespace, soft-rounded cards per the design system.
