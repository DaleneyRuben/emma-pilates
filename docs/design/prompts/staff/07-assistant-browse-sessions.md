# Prompt S07 — Browse Sessions (Assistant)

Staff app, Assistant role. Chains from Prompt S06 (Client Overview) — reached by tapping "Reservar clase". Prompt S08 (Session Detail) chains from this one.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same structure as the client app's Browse Sessions screen, design the **Browse Sessions** screen of the staff app, as seen by an Assistant booking a Session on behalf of the selected client.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Responsive:** phone gets the full-width single-column layout described below; tablet widens the session list into a two-column grid of cards rather than a single vertical column, since there's room for it.

**Navigation chrome:** a back arrow in the header returns to Client Overview. A persistent banner below the header reads "Reservando para: [Nombre del cliente]", so the Assistant always knows whose behalf they're acting on.

**Layout, top to bottom:**
1. Header: back arrow, title "Reservar una clase".
2. "Reservando para: [Nombre del cliente]" banner.
3. Branch selector, date picker, and Class Type filter chips — identical in style to the client app's Browse Sessions.
4. Session list, one card per Session (time, Class Type, Trainer, spots indicator), identical in style to the client app's.

Tapping a Session card navigates to Session Detail (Prompt S08).

Generous whitespace, soft-rounded cards per the design system.
