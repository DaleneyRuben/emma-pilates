# Prompt A02 — Client Search

Assistant app. Chains from Prompt A01 (Login) — this is the app's home/root screen. Prompt A03 (New Client) and Prompt A04 (Client Overview) chain from this one.

---

Using the Emma Pilates Studio design system (Prompt 00) and following on from Login (Prompt A01), design the **Client Search** screen of the assistant app — the app's home screen, where every task starts with finding or creating the client the Assistant is acting on behalf of.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Responsive:** design a phone layout and a tablet layout as two frames.
- **Phone** — a full-width search bar at top ("Buscar por nombre, teléfono o correo"), a "+ Nuevo cliente" button, and a vertical list of matching client results below as the client types. Tapping a result navigates to Client Overview (Prompt A04).
- **Tablet** — the same search bar and results list occupy a narrower left panel; a right panel shows a calm empty state ("Selecciona un cliente para ver sus detalles") when nothing is selected, and would show Client Overview's content in place once a result is tapped, rather than navigating away.

**Layout, top to bottom (phone) / left panel (tablet):**
1. Screen title "Buscar cliente".
2. Search field: "Buscar por nombre, teléfono o correo".
3. "+ Nuevo cliente" button (secondary/outlined style, since it's a less common action than searching).
4. Result rows, each showing the client's name and phone/email.

If the search has no matches, show: "No se encontró ningún cliente." with the "+ Nuevo cliente" button emphasized as the next step.

Generous whitespace, soft-rounded cards per the design system.
