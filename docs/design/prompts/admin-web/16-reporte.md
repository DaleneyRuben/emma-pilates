# Prompt AW16 — Reporte de Ingresos y Gastos

Admin desktop web. Reached via the sidebar's "Reporte" group. Same shell as Horario (Prompt AW02), but with its own Branch scoping (an aggregate "todas las sucursales" option) instead of the shared top-bar selector.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as Horario (Prompt AW02), design the **Reporte de Ingresos y Gastos** page of the admin desktop web app — income (confirmed Payments) against expenses (Salary Payments + Expenses), queried across both bounded contexts in one view.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Sidebar state:** "Reporte" active.

**Layout, top to bottom:**
1. Page title "Reporte de ingresos y gastos", with a date range picker and a Branch selector that includes a "Todas las sucursales" option, at the top right.
2. Three stat tiles side by side: "Ingresos" (Success-colored), "Gastos" (Error-colored), "Neto" (Plomo cálido, neutral — this is a summary figure, not a status).
3. A simple bar chart below the tiles, showing income vs. expenses per month across the selected date range.
4. A breakdown data table underneath: rows grouped by Expense Category, columns "Categoría", "Monto total".

Clean desktop density, give the stat tiles and chart the same visual care as the rest of the design system — this is the one screen in the app meant to be read at a glance rather than edited.
