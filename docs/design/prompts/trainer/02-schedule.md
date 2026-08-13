# Prompt T02 — My Schedule

Trainer mobile app. Chains from Prompt T01 (Login) — this is the home screen after authentication. Prompt T03 (Session Roster) chains from this one.

---

Using the Emma Pilates Studio design system (Prompt 00) and following on from Login (Prompt T01), design the **My Schedule** screen of the trainer mobile app — the trainer's home screen, showing only their own Sessions.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** none — this app has no tab bar (see design system's Trainer App Navigation note). This is the root screen.

**Layout, top to bottom:**
1. Greeting header: "Hola, [Nombre]" in the warm serif heading face.
2. A horizontally scrollable date picker (same style as the client app's Browse Sessions), today selected by default.
3. A vertical list of the trainer's own Session cards for the selected day, ordered by time, each showing: time range, Class Type name, Branch, and a booked count ("6 de 8 reservados").

Tapping a Session card navigates to Session Roster (Prompt T03).

If the trainer has no Sessions on the selected day, show an empty state: "No tienes clases este día."

Generous whitespace, soft-rounded cards per the design system.
