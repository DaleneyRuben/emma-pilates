# Prompt AW31 — Retiros e insumos consumidos

Admin desktop web. Chains from Prompt AW08 (Insumos) — reached via "Ver historial de retiros" (see Follow-up 07, which adds that entry point to AW08). Read-only — same shell as Horario (Prompt AW02).

---

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as Insumos (Prompt AW08), design the **Retiros e insumos consumidos** page of the admin desktop web app — the monthly consumption record `back-office/CONTEXT.md`'s Withdrawal entry describes, for the currently-selected Branch.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Sidebar state:** "Back Office" expanded, "Insumos" active (this page is a sub-view of Insumos, not its own sidebar item).

**Layout, top to bottom:**
1. Page title "Retiros e insumos consumidos" with a back link to Insumos (Prompt AW08) — no primary action, this page creates nothing (Withdrawals are only ever logged from AW10, at the moment of taking an item).
2. A filter row: a month picker (defaulting to the current month) and an "Insumo" dropdown filter (default "Todos").
3. Above the table, a one-line summary restating the filter, e.g. "14 retiros en agosto de 2026."
4. A data table, one row per Withdrawal: columns "Insumo", "Cantidad retirada", "Fecha" — sorted most recent first.
5. Footer strip under the table: total units withdrawn per Insumo for the selected month, as a compact secondary block below the table (e.g. "Papel higiénico: 18 unid. · Detergente: 6 unid."), since that per-item monthly total is the actual "consumption report" this page exists to support.

If no Withdrawals fall in the selected month/filter, show an empty state: "Sin retiros en este rango." with a line suggesting the client try a different month.

Clean desktop table density per the design system's list convention. Nothing on this page is editable.
