# Prompt 12 — Subscription Detail

Client mobile app. Reached from Home's Subscription status card (Prompt 02) or from Perfil. References Prompt 00 for style.

---

Using the Emma Pilates Studio design system (Prompt 00), design the **Subscription Detail** screen of the client mobile app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** bottom tab bar present, "Perfil" active; a back arrow in the header returns to Perfil.

**Layout, top to bottom:**
1. Header: back arrow, title "Mi plan".
2. Plan name and a status badge using the semantic colors (success "Activa" or error "Vencida").
3. Class allowance remaining, shown as a progress ring or bar — "X de Y clases" — out of the Plan's total allowance.
4. Date range: start date and the paid-through end date, clearly labeled.

**Show three separate frames:**
- **Activa** — normal state, no special messaging, allowance and dates shown plainly.
- **Por vencer** — within the 3-day renewal reminder window: a warning-colored banner near the top reading "Tu plan vence el [fecha]." This is informational only — no purchase button yet, since a new Plan can't be bought until the current one has actually expired.
- **Vencida** — status badge reads "Vencida" in the error color, allowance ring shown empty/greyed, and a prominent "Comprar un plan" button (Palo de rosa fill) replaces the normal layout's absence of a call-to-action, linking to Browse Plans.

Generous whitespace, consistent with the rest of the app.
