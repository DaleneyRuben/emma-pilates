# Prompt A08 — Confirm Cash Payment

Assistant app. Chains from Prompt A07 (Select Plan) — reached by tapping a Plan card. A cash Payment is confirmed the moment the Assistant records it (unlike the client's transfer flow), so this screen covers both the confirmation step and the instant success result.

---

Using the Emma Pilates Studio design system (Prompt 00) and consistent with Select Plan (Prompt A07), design the **Confirm Cash Payment** screen of the assistant app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Responsive:** phone and tablet share the same centered-card layout; on tablet the card is simply narrower relative to the screen, not full-width.

**Navigation chrome:** a back arrow in the header returns to Select Plan (only present in the confirmation frame, not the success frame).

**Show two separate frames:**

**Confirmación** (before recording):
- Header: back arrow, title "Confirmar pago en efectivo".
- A price breakdown card: "Precio del plan", a "Crédito aplicado" line if applicable, and a total line "Monto a cobrar en efectivo".
- A "Confirmar pago recibido" primary button (Palo de rosa fill) — the Assistant taps this only once the cash is physically in hand.

**Confirmado** (instant success, no pending state — cash Payments are confirmed the moment they're recorded):
- A success-colored status icon/illustration.
- "¡Pago registrado!" as the main message.
- A summary card of the client's new/renewed Subscription: Plan name, class allowance, and the new paid-through end date.
- A "Volver al cliente" primary button, returning to Client Overview (Prompt A04).

Generous whitespace, consistent with the rest of the app.
