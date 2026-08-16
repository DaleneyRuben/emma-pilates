# Prompt AW30 — Recuperar contraseña

Admin desktop web. Chains from Prompt AW01 (Login) — reached by tapping "¿Olvidaste tu contraseña?". Returns to Login once the flow completes.

---

Using the Emma Pilates Studio design system (Prompt 00) and consistent with Login (Prompt AW01), design the **Recuperar contraseña** page of the admin desktop web app.

**Language:** all visible copy is neutral Spanish (Bolivia), informal "tú" address.

**Responsive:** design a desktop frame (centered card, same treatment as Login) and a narrow/mobile-browser frame.

This is the entry point before any authenticated content — no sidebar, no navigation chrome.

**Layout, top to bottom:**
1. Brand header: "Emma" wordmark and "Movimiento · Equilibrio · Bienestar" tagline, centered.
2. A short explanatory line: "Te enviaremos un enlace para restablecer tu contraseña."
3. Field: "Correo electrónico".
4. A primary button: "Enviar enlace" (Palo de rosa fill).
5. A text link: "Volver a iniciar sesión".

Show two frames:
- **Formulario** — the empty form above.
- **Enviado** — a confirmation state replacing the form: a success icon, "Revisa tu correo", a line noting the link expires in a set window (e.g. "El enlace vence en 30 minutos."), and the "Volver a iniciar sesión" link.

Same scope as the client and staff apps' equivalent screens (Prompts 20, S18): this page only requests the reset link, it doesn't set the new password itself.
