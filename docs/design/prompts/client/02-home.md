# Prompt 02 — Home

Client mobile app. Chains from Prompt 01 (Login / Sign Up) — this is the first screen after authentication. References Prompt 00 (design system) for palette, type, and component style.

---

Using the Emma Pilates Studio design system (Prompt 00) and following on from the Login / Sign Up screen (Prompt 01), design the **Home** screen of the client mobile app — the first screen a client sees after logging in.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** bottom tab bar with four tabs — "Inicio" (active/selected), "Reservar", "Mis Reservas", "Perfil" — each with a thin line icon per the design system.

**Layout, top to bottom:**
1. Personalized greeting header: "Hola, [Nombre]" in the warm serif heading face.
2. **Promotions carousel** — horizontally swipeable cards, each with an image area, headline, and short description (admin-managed promotional content, e.g. a seasonal offer or studio announcement).
3. **Subscription status card** — plan name, a progress indicator showing remaining class allowance out of the plan's total, the paid-through end date, and a status badge using the semantic colors from Prompt 00 (success green = "Activa", warning amber = "Por vencer" when the renewal reminder window is active, error red = "Vencida" when expired).
4. **Quick actions** — a row or grid of tappable cards: "Reservar una clase" (to Browse Sessions), "Evaluación nutricional" (to Evaluations), "Mis referidos" (to Referrals).

**Show two states as separate frames:**
- **Active subscription** — the layout above in full, quick actions all enabled.
- **No active subscription** (expired or never purchased) — the Subscription status card is replaced with a prominent "Comprar un plan" call-to-action card in Palo de rosa, and the "Reservar una clase" quick action is disabled/greyed with a small note ("Necesitas un plan activo para reservar"), since booking is not possible without an active Subscription.

Generous whitespace between sections, soft-rounded cards with soft shadows per the design system.
