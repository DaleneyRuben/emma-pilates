# Prompt A06 — Session Detail

Assistant app. Chains from Prompt A05 (Browse Sessions) — reached by tapping a Session card.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same structure as the client app's Session Detail screen, design the **Session Detail** screen of the assistant app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Responsive:** phone gets the single-column layout described below; tablet keeps the same content but in a wider, centered card rather than edge-to-edge.

**Navigation chrome:** a back arrow in the header returns to Browse Sessions. The "Reservando para: [Nombre del cliente]" banner persists below the header.

**Layout, top to bottom:**
1. Header: back arrow, Class Type name as the title.
2. "Reservando para: [Nombre del cliente]" banner.
3. Trainer name, Branch/location, date, time range, duration, capacity indicator ("X de Y cupos disponibles") — identical in style to the client app's Session Detail.

**Show three separate frames for the primary action area, same as the client app:**
- **Cupos disponibles** — "Reservar" button.
- **Clase llena** — "Unirme a la lista de espera" button (an Assistant can waitlist a client the same as the client could themselves), with the note "Clase llena. Se avisará al cliente si se libera un cupo."
- **Sin clases disponibles en el plan** — "Reservar" disabled, with a note "El cliente no tiene clases disponibles en su plan." and a link "Registrar pago" (to Select Plan, Prompt A07).

Generous whitespace, consistent with the rest of the app.
