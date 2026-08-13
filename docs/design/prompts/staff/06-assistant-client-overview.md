# Prompt S06 — Client Overview (Assistant)

Staff app, Assistant role. Chains from Prompt S04 (Client Search) or Prompt S05 (New Client) — reached by selecting or creating a client. Prompt S07 (Browse Sessions) and Prompt S09 (Select Plan for cash payment) chain from this one.

---

Using the Emma Pilates Studio design system (Prompt 00) and consistent with Client Search (Prompt S04), design the **Client Overview** screen of the staff app, as seen by an Assistant — everything they need to act on behalf of one selected client.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Responsive:** design a phone layout and a tablet layout as two frames.
- **Phone** — its own full screen, reached by navigating from Client Search.
- **Tablet** — the right-hand detail panel alongside Client Search's list (Prompt S04), shown in place rather than as a separate navigation.

**Navigation chrome (phone only):** a back arrow in the header returns to Client Search.

**Layout, top to bottom:**
1. Client's name as the header/title.
2. A Subscription status card — plan name, remaining class allowance, paid-through end date, and a status badge using the semantic colors (success "Activa", error "Vencida") — or, if the client has no active Subscription, a "Sin plan activo" state in place of the card.
3. Quick action buttons: "Reservar clase" (→ Browse Sessions, Prompt S07; disabled if no active Subscription, same reasoning as the client app's Home) and "Registrar pago en efectivo" (→ Select Plan, Prompt S09).
4. A "Ver historial" text link showing the client's past attended classes inline or linking out.

Show both the **active Subscription** and **no active Subscription** states as separate frames, matching the client app's Home screen pattern.

Generous whitespace, soft-rounded cards per the design system.
