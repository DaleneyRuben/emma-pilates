# Prompt S18 — Recover Password

Staff app. Chains from Prompt S01 (Login) — reached by tapping "¿Olvidaste tu contraseña?", shared by all four Roles. Returns to Login once the flow completes.

---

Using the Emma Pilates Studio design system (Prompt 00) and consistent with Login (Prompt S01), design the **Recover Password** screen of the staff app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

This is a pre-authentication screen — no navigation chrome, a back arrow in the header returns to Login.

**Layout, top to bottom:**
1. Header: back arrow, title "Recuperar contraseña".
2. A short explanatory line: "Te enviaremos un enlace para restablecer tu contraseña."
3. Field: "Correo electrónico o teléfono".
4. A primary button: "Enviar enlace" (Palo de rosa fill).

Show two frames:
- **Formulario** — the empty form above.
- **Enviado** — a confirmation state replacing the form: a success icon, "Revisa tu correo" (or "Revisa tus mensajes" if a phone number was entered), a line noting the link expires in a set window (e.g. "El enlace vence en 30 minutos."), and a text link "Volver a iniciar sesión" back to Login.

Same scope as the client app's equivalent screen (Prompt 20): this screen only requests the reset link, it doesn't set the new password itself.

Keep the form vertically centered with generous whitespace, consistent with Login.
