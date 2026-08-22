# Follow-up — Verify a self-registered Client's email

Targets: **Client `01`**. Send [30](./30-invariants-checklist.md) and the still-pending [33](./33-email-only-authentication.md) alongside this follow-up.

---

[ADR-0029](../../../adr/0029-manage-authentication-in-the-nestjs-backend.md) now requires a self-registered Client to verify the required email address before receiving normal application access. Registration sends a single-use verification link; opening it verifies the address but does not sign the Client in automatically.

Add one post-registration frame to `01` **Iniciar sesión · Registrarse**:

- Replace the registration form with a calm confirmation state after **Crear cuenta** succeeds.
- Use the heading **"Revisa tu correo"**.
- Explain that a verification link was sent to the submitted email address and that the Client must open it before signing in.
- State that the verification link expires after **24 hours**.
- Show the submitted email address so a typo is visible.
- Provide a text action **"Cambiar correo"** beside that address. It lets the Client correct the unverified address without signing in, then returns to **Revisa tu correo** showing the corrected address. A successful correction invalidates every verification link sent to the old address and sends one new link to the corrected address with a fresh 24-hour lifetime.
- Provide a secondary **"Reenviar correo"** action and a text link **"Volver a iniciar sesión"**. A successful resend invalidates every older unused verification link and sends one new link with a fresh 24-hour lifetime; only the newest link works.
- Do not show the authenticated tab bar or route to Inicio from this state.
- The verification link itself does not open an authenticated session. After verification, the Client returns to `01` and signs in normally.

The resend-limit policy and the behavior when the Client no longer has the pending-registration flow open are not settled yet, so do not invent either in this design. **Cambiar correo** is only for this still-pending self-registration; do not present it as a way to change an activated Account's verified login email.

Preserve the existing login, biometric, registration, and referral-code frames and their visual styling. Apply follow-up 33's email-only correction at the same time; do not reintroduce phone as a signup or login identifier.
