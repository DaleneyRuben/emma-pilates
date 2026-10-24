# Prompt AW41 — Congelamientos

Admin desktop web. Reached via the sidebar's "Back Office" group, after
"Fundadoras". Same shell as Horario (Prompt AW02). Read-only list with a
decision on each row — no chained form.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as
Horario (Prompt AW02), design the **Congelamientos** page of the admin desktop
web app — the pending Freeze requests, for the Administrator only. A Client
asks from Mi plan; this page never creates a request.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú"
address. The studio counts Clients in the feminine.

**Sidebar state:** "Back Office" expanded, "Congelamientos" active.

**Layout, top to bottom:**

1. Page title "Congelamientos", no primary action button. A one-line subtitle
   reads "Solicitudes pendientes de una clienta."
2. No filter row.
3. A data table, one row per request: "Clienta", "Plan", "Desde", "Hasta"
   (civil dates as `dd/mm/aaaa`), "Motivo", and "Decisión" — two buttons,
   "Aprobar" and "Rechazar".

Clicking a row does nothing extra — the decision lives in the row.

At 420 px the sidebar collapses behind "Abrir menú" and each request is a
card with the same facts and the same two buttons.

Empty state: "No hay solicitudes pendientes."

After a decision the subtitle becomes "Congelamiento aprobado" or
"Congelamiento rechazado" and the row leaves the list.

Clean desktop table density per the design system's list convention.
