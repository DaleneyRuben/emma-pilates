# Prompt AW32 — Crear contraseña

Admin desktop web. The screen the reset link in the email opens — the destination Prompt AW30 (Recuperar contraseña) points at when it says "la contraseña nueva se define después, desde el enlace del correo". Also the **forced** step after Login (Prompt AW01) the first time an Administrator signs in with the temporary password generated in Prompt AW24. Returns to Login, or straight into Horario (Prompt AW02) when it followed a first login. Same role in the admin web that Prompt 21 plays in the client app and Prompt S19 in the staff app.

---

Using the Emma Pilates Studio design system (Prompt 00) and consistent with Login (Prompt AW01) and Recuperar contraseña (Prompt AW30), design the **Crear contraseña** page of the admin desktop web app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Responsive:** design a desktop frame (centered card, same treatment as Login and AW30) and a narrow/mobile-browser frame.

No sidebar, no top bar, no navigation chrome — there is no authenticated session yet, and the step can't be skipped or backed out of.

**Layout, top to bottom:**
1. Brand header: "Emma" wordmark and "Movimiento · Equilibrio · Bienestar" tagline, centered — same as AW01/AW30.
2. Title "Crea tu contraseña" and one explanatory line whose wording depends on how the page was reached (see the frames below).
3. Field: "Contraseña nueva".
4. Field: "Confirmar contraseña" — inline validation when the two don't match.
5. A primary button: "Guardar contraseña" (Palo de rosa fill), disabled until both fields are filled and match.

Show four frames:
- **Escritorio · Desde el enlace del correo** — explanatory line: "Elige una contraseña nueva para tu cuenta." Both fields empty, button disabled.
- **Escritorio · Primer ingreso** — the temporary-password case: explanatory line "Iniciaste sesión con una contraseña temporal. Elige una nueva para continuar." Otherwise identical.
- **Escritorio · Enlace vencido** — the AW30 link expired (30 minutes, per that screen). The card replaces the form with a short message, "Este enlace ya no es válido", a line explaining the link expires after 30 minutes, and a primary button "Pedir un enlace nuevo" that returns to AW30.
- **Navegador angosto · 420 px** — the form at narrow width, card full-width with less side padding.

Where the page goes on success depends on the entry point, and the frames should note it: from the email link, back to Login (AW01) with a brief confirmation; from a first login, straight into Horario (AW02) with the session already open.

A "Volver a iniciar sesión" text link sits below the button in every state, so the page is never a dead end — same rule as AW30.
