# Prompt AW27 — Créditos

Admin desktop web. Reached via the sidebar's "Promociones" group. Same shell as Horario (Prompt AW02). Read-only — no chained form.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as Horario (Prompt AW02), design the **Créditos** page of the admin desktop web app — a read-only oversight list of Clients with a nonzero Credit balance, for support and reconciliation. Credit is earned automatically through Referrals and spent automatically at Payment confirmation, so this page has no manual adjustment action.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Sidebar state:** "Promociones" expanded, "Créditos" active.

**Layout, top to bottom:**
1. Page title "Créditos", no primary action button. A one-line subtitle notes the sum of all outstanding Credit across Clients (e.g. "Bs 640,00 en saldo activo").
2. A filter row: a search field (placeholder "Buscar por nombre de cliente").
3. A data table, one row per Client with Credit > 0: columns "Cliente", "Saldo de crédito" (Bs, right-aligned, tabular), "Última actividad" (date of the most recent Credit movement — earned or spent).

Clicking a row does nothing extra worth designing — skip a detail/movements panel for this page; a running ledger per Client is a future addition, not part of this screen.

Clean desktop table density per the design system's list convention.
