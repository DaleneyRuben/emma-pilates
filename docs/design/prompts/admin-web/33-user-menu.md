# Prompt AW33 — Menú de usuario y cambiar contraseña

Admin desktop web. Not a page of its own — the two overlay states of the **user menu** that the shell (Prompt AW02) already draws in the top bar as an avatar, name and chevron, but that no screen has ever opened. Today the admin web has no designed way to log out and no way to change your own password. Reachable from every authenticated page.

---

Using the Emma Pilates Studio design system (Prompt 00) and the shell established by Horario (Prompt AW02), design the **menú de usuario** of the admin desktop web app and the **Cambiar contraseña** panel it opens.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Context:** draw both states over the Horario page (Prompt AW02), sidebar and top bar intact, so the overlay reads in place. Nothing behind the overlay changes.

Show four frames:

**1. Escritorio · Menú abierto.** Clicking the top-bar user cell (26px `#D8BDB8` avatar with initials, name, chevron) opens a popover anchored to its right edge, using the design system's popover shadow `0 12px 28px rgba(74,58,48,0.14)`, white, 1px `#E4D8CC`, radius 10, roughly 240px wide.
- A header block inside the popover: name in 14px weight 500, email below in 11.5px `#A79E9A`, and the role as a neutral label — "Administradora" — never a status pill (same rule as AW23).
- A divider, then two menu rows, 36px each, 13.5px, hover `#FAF3EC`: "Cambiar contraseña" and "Cerrar sesión".
- "Cerrar sesión" carries the Error tone on its text only, not a fill — it is not the reason anyone opens this menu (same restraint as the client app's Perfil screen).
- The chevron rotates while open; clicking anywhere outside or pressing Esc closes the popover.

**2. Escritorio · Cambiar contraseña.** "Cambiar contraseña" opens the standard 408px side panel over the dimmed (`rgba(74,58,48,0.22)`) page, per the design system's side-panel form convention.
- Header: title "Cambiar contraseña", context line "Tu sesión seguirá abierta en este navegador.", 30px square close button.
- Fields: "Contraseña actual", "Contraseña nueva", "Confirmar contraseña" — 44px controls, inline validation when the last two don't match.
- Footer: full-width primary "Guardar contraseña" (46px), disabled until all three fields are filled and the two new ones match.
- This panel is for a signed-in administrator who knows their current password; it is not the reset flow (Prompts AW30/AW32), and it does not offer one — the password-forgotten path lives on the login screen.

**3. Escritorio · Confirmar cierre de sesión.** "Cerrar sesión" does not log out immediately: it swaps the popover for a compact confirmation in the same anchored position — "¿Cerrar sesión?", one line noting any unsaved panel will be discarded, then "Cerrar sesión" (Error, outlined) and a "Cancelar" text link. Confirming returns to Login (Prompt AW01).

**4. Navegador angosto · 420 px.** At narrow width the top bar keeps the avatar only; the popover becomes a full-width sheet anchored to the bottom, and the Cambiar contraseña panel becomes a full-screen sheet, per the responsive rules in the design system.

Note in the frames that this menu is present on every authenticated admin page, unchanged — it belongs to the shell, not to Horario.
