# Prompt AM02 — Pending Payments

Admin mobile app. Chains from Prompt AM01 (Login) — this is the app's home/root screen, the one a push notification opens directly into. Prompt AM03 (Payment Review) chains from this one; Prompt AM04 (Cancel Session Search) is a secondary path reached from this screen's header.

---

Using the Emma Pilates Studio design system (Prompt 00) and following on from Login (Prompt AM01), design the **Pending Payments** screen of the admin mobile app — the home screen, listing every transfer Payment awaiting confirmation.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** a header icon/button, "Cancelar una clase", in the top-right corner, leading to the secondary Cancel Session flow (Prompt AM04). No tab bar (see design system's Admin Mobile App Navigation note).

**Layout, top to bottom:**
1. Screen title "Pagos pendientes", with a count badge if there are any.
2. A vertical list of pending Payment cards, each showing: client name, Plan name, amount, and how long ago it was submitted (e.g. "Hace 20 min").

Tapping a card navigates to Payment Review (Prompt AM03).

If there are no pending Payments, show a calm empty state: "No hay pagos pendientes." — this is a good state for an Administrator, not a problem to fix.

Generous whitespace, soft-rounded cards per the design system.
