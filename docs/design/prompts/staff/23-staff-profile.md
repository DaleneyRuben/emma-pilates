# Prompt S23 — Perfil (Staff)

Staff app, every role. The screen the avatar in the header already promises but that has never been designed: Prompt S02's own notes say "El avatar abre perfil y cierre de sesión". Reached from the avatar on each role's root screen — Mi agenda (Prompt S02) for the Trainer, Buscar cliente (Prompt S04) for the Assistant, Pagos pendientes (Prompt S11) for Administración, Mi agenda (Prompt S15) for the Nutritionist. The staff app has no tab bar for any role, so this is the only place a staff member can change their password or log out.

---

Using the Emma Pilates Studio design system (Prompt 00) and the same header-with-back-arrow pattern the rest of the staff app uses, design the **Perfil** screen of the staff app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Navigation chrome:** header with a back arrow that returns to whichever root screen the account landed on. No tab bar — the staff app has none.

**Layout, top to bottom:**
1. Summary card: initials avatar on `#EFE0DC` (no photos in the staff app), name, email, phone. Read-only — a staff member's own record is maintained by an Administrator in Prompt AW24, so there is no "Editar" here. A short line states it: "Tus datos los actualiza administración."
2. Two read-only rows below the summary, each label + value:
   - **Rol** — "Entrenadora" / "Asistente" / "Administración" / "Nutricionista", rendered as a neutral label, never a status pill (same rule as AW23/AW24).
   - **Sucursales** — the assigned branches as plain text ("Equipetrol, Urubó"), or "Todas las sucursales" for Administración, matching how AW24 states it.
3. A menu group, same 60px rows / line icon / chevron treatment as the client app's Perfil (Prompt 18):
   - "Notificaciones" → Prompt S20.
   - "Cambiar contraseña" → the change-password step described below.
4. A "Cerrar sesión" button: neutral outline that takes the Error tone only on press — never a solid fill, same restraint as the client app's Perfil. Tapping it asks for confirmation ("¿Cerrar sesión?") before returning to Login (Prompt S01).
5. Footer line: "Emma Pilates Studio · versión 1.0".

Show these frames:
- **iOS · Entrenadora** — the layout above, one branch assigned.
- **iOS · Cambiar contraseña** — the same screen pushed to a change-password step: fields "Contraseña actual", "Contraseña nueva", "Confirmar contraseña", inline validation when the two new ones don't match, and a primary "Guardar contraseña" button pinned above the bottom edge, disabled until all three are filled and the new ones match. This is for a signed-in staff member who knows their current password — distinct from Prompt S19 (Crea tu contraseña), which is the forced first-login step, and from Prompt S18 (Recuperar contraseña), which runs before any session exists.
- **iOS · Administración** — same screen for an Administrator: the Sucursales row reads "Todas las sucursales".
- **Android · Entrenadora** — same content, Android header height.

Generous whitespace, calm tone, consistent with the rest of the staff app. Nothing on this screen is editable except the password.
