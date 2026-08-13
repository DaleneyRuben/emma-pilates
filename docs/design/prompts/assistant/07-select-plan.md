# Prompt A07 — Select Plan

Assistant app. Chains from Prompt A04 (Client Overview) — reached by tapping "Registrar pago en efectivo". Prompt A08 (Confirm Cash Payment) chains from this one.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same structure as the client app's Browse Plans screen, design the **Select Plan** screen of the assistant app — used to record a cash Payment on a client's behalf.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Responsive:** phone gets a single-column list; tablet widens Plan cards into a two-column grid.

**Navigation chrome:** a back arrow in the header returns to Client Overview. The "Registrando pago para: [Nombre del cliente]" banner persists below the header.

**Layout, top to bottom:**
1. Header: back arrow, title "Elige un plan".
2. "Registrando pago para: [Nombre del cliente]" banner.
3. If the client has an available Credit balance, a banner: "Este cliente tiene Bs [monto] de crédito disponible."
4. A vertical list of Plan cards (name, duration, class allowance, price — discounted price shown if Credit applies), identical in style to the client app's Browse Plans.

Tapping a Plan card navigates to Confirm Cash Payment (Prompt A08).

Generous whitespace, soft-rounded cards per the design system.
