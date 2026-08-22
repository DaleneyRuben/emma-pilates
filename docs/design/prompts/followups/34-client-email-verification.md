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
- Provide a secondary **"Reenviar correo"** action and a text link **"Volver a iniciar sesión"**.
- Do not show the authenticated tab bar or route to Inicio from this state.
- The verification link itself does not open an authenticated session. After verification, the Client returns to `01` and signs in normally.

The resend-limit policy is not settled yet, so do not invent a retry count in this design.

Preserve the existing login, biometric, registration, and referral-code frames and their visual styling. Apply follow-up 33's email-only correction at the same time; do not reintroduce phone as a signup or login identifier.
