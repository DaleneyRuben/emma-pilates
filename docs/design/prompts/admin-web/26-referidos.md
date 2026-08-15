# Prompt AW26 — Referidos

Admin desktop web. Reached via the sidebar's "Promociones" group. Same shell as Horario (Prompt AW02). Read-only — no chained form.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as Horario (Prompt AW02), design the **Referidos** page of the admin desktop web app — a read-only oversight list of Referrals, for support and reconciliation. A Referral is created automatically when a Client signs up with another Client's code, so this page has no create action.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Sidebar state:** "Promociones" expanded, "Referidos" active.

**Layout, top to bottom:**
1. Page title "Referidos", no primary action button. A one-line subtitle notes the total count.
2. A filter row: a search field (placeholder "Buscar por nombre de cliente").
3. A data table, one row per Referral: columns "Cliente que refiere", "Cliente referido", "Fecha de registro", and "Estado" — a status pill reading "Crédito otorgado" (Éxito) once the referred Client's first Payment is confirmed, or "Pendiente" (Advertencia) while it still isn't.

Clicking a row does nothing extra worth designing — the row itself is the whole record; skip a detail panel for this page.

Clean desktop table density per the design system's list convention.
