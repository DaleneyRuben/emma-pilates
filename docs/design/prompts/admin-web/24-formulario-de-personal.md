# Prompt AW24 — Formulario de Personal

Admin desktop web. Chains from Prompt AW23 (Personal) — reached via "+ Nuevo miembro" or by clicking a row. Shown as a side panel over the Personal table.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same shell as Personal (Prompt AW23), design the **Formulario de Personal** — a side panel used to create or edit a Staff Member account.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Layout, top to bottom:**
1. Panel header: title "Nuevo miembro" (create) or "Editar miembro" (edit), close icon.
2. Field: "Nombre".
3. Field: "Correo electrónico o teléfono".
4. Field: "Rol" — a choice of Entrenador / Asistente / Administrador / Nutricionista. A Staff Member has exactly one Role.
5. Field: "Sucursales asignadas" — a multi-select of Branches. When "Rol" is set to Administrador, this field is replaced by a read-only row reading "Todas las sucursales (implícito por el rol)", since an Administrator's scope is every Branch, not a chosen subset.
6. On create only: a read-only "Contraseña temporal" field showing a system-generated password, with a "Copiar" button — the same pattern as New Client (Prompt S05) on the staff app, since this is the same relay-the-password-directly flow.
7. A "Guardar" primary button (Palo de rosa fill).

Show three frames: **Nuevo miembro** (empty, Rol unset), **Nuevo miembro** with Rol = Administrador (showing the "Todas las sucursales" read-only substitution), and **Editar miembro** (pre-filled, no temporary-password field).

Clean desktop density, consistent with the Plan Form panel (Prompt AW05).
