# Prompt 20 — Recover Password

Client mobile app. Chains from Prompt 01 (Login) — reached by tapping "¿Olvidaste tu contraseña?". Returns to Login once the flow completes.

---

Using the Emma Pilates Studio design system (Prompt 00) and consistent with Login / Sign Up (Prompt 01), design the **Recover Password** screen of the client mobile app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

This is a pre-authentication screen — no tab bar, a back arrow in the header returns to Login.

**Layout, top to bottom:**
1. Header: back arrow, title "Recuperar contraseña".
2. A short explanatory line: "Te enviaremos un enlace para restablecer tu contraseña."
3. Field: "Correo electrónico o teléfono".
4. A primary button: "Enviar enlace" (Palo de rosa fill).

Show two frames:
- **Formulario** — the empty form above.
- **Enviado** — a confirmation state replacing the form: a success icon, "Revisa tu correo" (or "Revisa tus mensajes" if a phone number was entered), a line explaining the link expires in a set window (e.g. "El enlace vence en 30 minutos."), and a text link "Volver a iniciar sesión" back to Login.

This screen does not set a new password itself — it only requests the reset link. Setting the new password happens wherever that link opens (outside this screen's scope, same as any standard reset-link flow).

Generous whitespace, consistent with the rest of the app.
