# Follow-up — Neutral role label in the admin user menu

Targets: **AW33 (Menú de usuario y cambiar contraseña)**. Send [30](./30-invariants-checklist.md) alongside this follow-up.

---

`AW33` labels the signed-in Administrator's role **"Administradora"**. Every
Staff Member has exactly one Role, and the Administrator Role is not tied to
one person: the studio can have several Administrators
([ADR-0083](../../../adr/0083-bootstrap-the-first-administrator-through-a-command.md),
IDN-007), and any of them opens this same menu. The staff app's Perfil
(`S23`) already names the Role **"Administración"**, which works whoever is
signed in.

Apply this focused correction:

- In frame 1 (Escritorio · Menú abierto) and frame 4 (Navegador angosto ·
  420 px), change the role label under the email from **"Administradora"** to
  **"Administración"**. Keep it as a neutral label, never a status pill (same
  rule as `AW23`).
- The popover's row hover uses the palette's **Hover de fila** `#FDF7F2`
  (the palette is closed, so the off-palette `#FAF3EC` in the prompt does not
  exist).

Leave everything else on `AW33` as it is: the name, email, initials avatar,
the two rows, the Error tone on "Cerrar sesión", the logout confirmation, the
408 px Cambiar contraseña panel and its full-screen narrow sheet.
