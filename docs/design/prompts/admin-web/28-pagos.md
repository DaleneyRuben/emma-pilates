# Prompt AW28 — Pagos

Admin desktop web. Reached via the sidebar's "Back Office" group. Same shell as Horario (Prompt AW02). Per [ADR-0006](../../adr/0006-extend-payment-confirmation-to-desktop-admin.md), this duplicates rather than replaces the mobile Pending Payments flow (Prompts S11/S12) — both surfaces can confirm or reject. Prompt AW29 (Revisar Pago) chains from this one.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as Horario (Prompt AW02), design the **Pagos** page of the admin desktop web app — every transfer Payment, for review and confirmation from a desk.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Sidebar state:** "Back Office" expanded, "Pagos" active, with the same pending-count badge (e.g. "6") shown next to the sidebar link.

**Not branch-scoped** — same exception as Nómina (Prompt AW11). A Payment follows a studio-wide Subscription, not a Branch, so this page ignores the top-bar Branch selector and lists every Payment across the whole studio.

**Layout, top to bottom:**
1. Page title "Pagos", no primary action button — Payments are raised by clients, never created here.
2. A filter row: a search field (placeholder "Buscar por cliente") plus an "Estado" dropdown filter (Todos / Pendiente / Confirmado / Rechazado), defaulting to Pendiente.
3. A data table, one row per Payment: columns "Cliente", "Plan", "Monto" (Bs, right-aligned, tabular), "Fecha" (when submitted), and "Estado" (status pill: Pendiente/Advertencia, Confirmado/Éxito, Rechazado/Error).

Clicking a **Pendiente** row navigates to Revisar Pago (Prompt AW29). Clicking a Confirmado or Rechazado row does nothing further — those are settled and final, so skip a detail panel for them; the row itself is the whole record.

Clean desktop table density per the design system's list convention.
