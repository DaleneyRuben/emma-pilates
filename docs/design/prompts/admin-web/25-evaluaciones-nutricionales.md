# Prompt AW25 — Evaluaciones Nutricionales

Admin desktop web. Reached via the sidebar's "Back Office" group. Same shell as Horario (Prompt AW02). Read-only — no chained form.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as Horario (Prompt AW02), design the **Evaluaciones Nutricionales** page of the admin desktop web app — a read-only oversight list of booked Evaluations, for visibility across the whole studio. The Nutritionist manages their own agenda and Availability Blocks day-to-day on the staff app (Prompts S15–S17); this page has no create, edit, or cancel action.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Sidebar state:** "Back Office" expanded, "Evaluaciones nutricionales" active.

**Layout, top to bottom:**
1. Page title "Evaluaciones nutricionales", no primary action button.
2. A filter row: a date range picker (defaulting to the current week) plus a "Nutricionista" dropdown filter, for studios with more than one.
3. A data table, one row per Evaluation: columns "Cliente", "Nutricionista", "Fecha" and "Hora" (or one combined "Fecha y hora" column, tabular).

No status column — an Evaluation has no attendance/no-show record in the domain model (unlike a Session), so don't invent one.

Clean desktop table density per the design system's list convention.
