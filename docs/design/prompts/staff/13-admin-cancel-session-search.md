# Prompt S13 — Cancel Session Search (Administrator)

Staff app, Administrator role. Reached from Pending Payments' header action (Prompt S11) — the secondary path for the Administrator's second core task, emergency Session cancellation. Prompt S14 (Cancel Session Confirm) chains from this one.

---

Using the Emma Pilates Studio design system (Prompt 00), design the **Cancel Session Search** screen of the staff app, as seen by an Administrator finding the Session they need to cancel as a last resort, when no substitute Trainer can cover it. An Administrator can see every Branch, unlike the Trainer or Assistant roles.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** a back arrow in the header returns to Pending Payments.

**Layout, top to bottom:**
1. Header: back arrow, title "Cancelar una clase".
2. Branch selector (covering all Branches, not just one), date picker, and Class Type filter chips — same style as the client app's Browse Sessions.
3. A Session list, one card per Session, showing: time, Class Type, Trainer name, Branch, and booked count ("6 reservas"). Unlike other Session lists in the app, this one includes full Sessions and shows the Trainer clearly, since the Administrator is looking for a specific class that's lost its coverage.

Tapping a Session card navigates to Cancel Session Confirm (Prompt S14).

Generous whitespace, soft-rounded cards per the design system.
