# Prompt AW37 — Fundadoras

Admin desktop web. Reached via the sidebar's "Back Office" group, after
"Clientes". Same shell as Horario (Prompt AW02). Read-only — no chained form.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as
Horario (Prompt AW02), design the **Fundadoras** page of the admin desktop
web app — a read-only list of the Founder Memberships, for the Administrator
and, later, the Coordinator. A membership is given automatically to the first
40 distinct Clients whose first real Payment is confirmed, so this page has
no create action and no assignment.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú"
address. The studio counts Clients in the feminine.

**Sidebar state:** "Back Office" expanded, "Fundadoras" active.

**Layout, top to bottom:**

1. Page title "Fundadoras", no primary action button. A one-line subtitle
   reads "12 de 40 lugares" (the number of memberships given, of 40).
2. No filter row: at most 40 rows.
3. A data table, one row per membership, in number order: "Número",
   "Clienta", "Desde" (the day the first real Payment was confirmed, as
   `dd/mm/aaaa`), and "Estado" — a status pill reading "Activa" (Éxito) or
   "Perdida" (neutral).

Clicking a row does nothing extra worth designing — the row itself is the
whole record; skip a detail panel.

At 420 px the table becomes one card per membership: the number and the name
on the first line, the date and the pill on the second.

Empty state: "Todavía no hay fundadoras." and, under it, "El lugar se otorga
al confirmarse el primer pago real."

Clean desktop table density per the design system's list convention.
