# Prompt AW22 — Detalle de Cliente

Admin desktop web. Chains from Prompt AW21 (Clientes) — reached by clicking a row. Shown as a side panel over the Clientes table.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as Clientes (Prompt AW21), design the **Detalle de Cliente** — a read-only side panel summarizing one Client for support purposes. No fields here are editable; this panel has no "Guardar" button.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Layout, top to bottom:**
1. Panel header: the Client's name as the title, a short context line below it ("Cliente desde dd/mm/aaaa"), close icon.
2. A "Contacto" block: correo electrónico, teléfono.
3. A "Plan" block: the active Subscription's Plan name, date range, remaining class allowance, and status pill — or a plain "Sin plan activo" line if none.
4. A "Crédito" row: current Credit balance in Bs, right-aligned, tabular.
5. A "Referidos" row: how many Clients this person has referred, and the referral code itself in a small monospace-style chip.

Every value here is read-only, styled with the design system's `#FAF7F2` read-only row treatment (no padlock icon needed — this whole panel is a summary view, not a locked field inside an otherwise-editable form).

Clean desktop density, consistent with other side panels, but no footer button.
