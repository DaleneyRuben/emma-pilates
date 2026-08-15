# Prompt AW21 — Clientes

Admin desktop web. Reached via the sidebar's "Back Office" group. Same shell as Horario (Prompt AW02). Prompt AW22 (Detalle de Cliente) chains from this one.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as Horario (Prompt AW02), design the **Clientes** page of the admin desktop web app — a searchable directory of every Client, for lookup and support, not for creating accounts.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Sidebar state:** "Back Office" expanded, "Clientes" active.

Clients are created by an Assistant on the staff app (New Client, Prompt S05) or by self-registration — this page has **no "+ Nuevo cliente" button**, it is read-only oversight.

**Layout, top to bottom:**
1. Page title "Clientes", no primary action button. A one-line subtitle notes the total count (e.g. "148 clientes").
2. A filter row: a search field (placeholder "Buscar por nombre, correo o teléfono") — Clients have no home Branch, so no Branch filter.
3. A data table, one row per Client: columns "Nombre", "Contacto" (correo/teléfono), "Plan" (the Subscription's Plan name, or "Sin plan activo" in Texto tenue if expired/none), "Estado" (Activo/Expirado status pill).

Clicking a row navigates to Detalle de Cliente (Prompt AW22).

Clean desktop table density per the design system's list convention.
