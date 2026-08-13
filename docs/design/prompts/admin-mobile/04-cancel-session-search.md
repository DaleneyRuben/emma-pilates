# Prompt AM04 — Cancel Session Search

Admin mobile app. Reached from Pending Payments' header action (Prompt AM02) — the secondary path for the app's second core task, emergency Session cancellation. Prompt AM05 (Cancel Session Confirm) chains from this one.

---

Using the Emma Pilates Studio design system (Prompt 00), design the **Cancel Session Search** screen of the admin mobile app — where an Administrator finds the Session they need to cancel as a last resort, when no substitute Trainer can cover it. An Administrator can see every Branch, unlike other staff.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** a back arrow in the header returns to Pending Payments.

**Layout, top to bottom:**
1. Header: back arrow, title "Cancelar una clase".
2. Branch selector (covering all Branches, not just one), date picker, and Class Type filter chips — same style as the client app's Browse Sessions.
3. A Session list, one card per Session, showing: time, Class Type, Trainer name, Branch, and booked count ("6 reservas"). Unlike other Session lists in the app, this one includes full Sessions and shows the Trainer clearly, since the Administrator is looking for a specific class that's lost its coverage.

Tapping a Session card navigates to Cancel Session Confirm (Prompt AM05).

Generous whitespace, soft-rounded cards per the design system.
