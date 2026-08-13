# Prompt 03 — Browse Sessions

Client mobile app. Chains from Prompt 02 (Home) — reached by tapping "Reservar una clase" on Home or the "Reservar" tab. Prompt 04 (Session Detail) chains from this one.

---

Using the Emma Pilates Studio design system (Prompt 00) and consistent with Home (Prompt 02), design the **Browse Sessions** screen of the client mobile app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** bottom tab bar with "Reservar" active.

**Layout, top to bottom:**
1. Screen title "Reservar una clase".
2. **Branch selector** — a compact dropdown or chip, e.g. "Sucursal: Centro", since a client can book at any Branch and needs to pick which one they're browsing.
3. **Date picker** — a horizontally scrollable row of the next 7 days (day-of-week + date), with the selected day highlighted in Palo de rosa.
4. **Class Type filter chips** — a horizontal row: "Todas", "Reformer Pilates", "Mat Pilates" (and similar), the active filter highlighted.
5. **Session list** for the selected Branch, date, and filter — one card per Session, ordered by time, each showing: time range, Class Type name, Trainer name, and a spots indicator. Spots indicator reads "X cupos disponibles" in the default text color when open, and a distinct "Lleno" tag when at capacity (muted, not an error color — a full class isn't a problem state, just full).

Tapping any Session card navigates to Session Detail (Prompt 04).

Generous whitespace, soft-rounded cards per the design system.
