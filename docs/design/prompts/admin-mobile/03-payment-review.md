# Prompt AM03 — Payment Review

Admin mobile app. Chains from Prompt AM02 (Pending Payments) — reached by tapping a pending Payment card.

---

Using the Emma Pilates Studio design system (Prompt 00) and consistent with Pending Payments (Prompt AM02), design the **Payment Review** screen of the admin mobile app — where the Administrator checks a client's transfer receipt against the studio's bank app and confirms or rejects it.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** a back arrow in the header returns to Pending Payments.

**Layout, top to bottom:**
1. Header: back arrow, title "Revisar pago".
2. Client name, Plan name, and the amount to verify, shown prominently.
3. A large view of the client's uploaded transfer receipt screenshot (tappable to zoom).
4. Two buttons side by side: "Confirmar pago" (Palo de rosa fill) and "Rechazar" (outlined, error-tinted).

**Show two frames:**
- **Default** — as described above.
- **Rechazar expanded** — tapping "Rechazar" reveals a "Motivo del rechazo" text field (placeholder: "Ej. el monto no coincide con la transferencia recibida.") and a "Confirmar rechazo" button, so a reason is always recorded before the rejection goes through.

Confirming or rejecting returns to Pending Payments with a brief toast confirmation ("Pago confirmado" / "Pago rechazado") — no separate full-screen result state needed, this is a fast admin action.

Generous whitespace, consistent with the rest of the app.
