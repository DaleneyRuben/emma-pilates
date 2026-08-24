# Follow-up — Verify a self-registered Client's email

Targets: **Client `01`**. Send [30](./30-invariants-checklist.md) and the still-pending [33](./33-email-only-authentication.md) alongside this follow-up.

---

[ADR-0029](../../../adr/0029-manage-authentication-in-the-nestjs-backend.md) now requires a self-registered Client to verify the required email address before receiving normal application access. Registration sends a single-use verification link; opening it verifies the address but does not sign the Client in automatically.

Add one post-registration frame to `01` **Iniciar sesión · Registrarse**:

- Replace the registration form with a calm confirmation state after **Crear cuenta** succeeds.
- If **Crear cuenta** repeats a self-registration for the same email while that self-registered Client Account is still pending, reuse the existing Account and Client rather than creating duplicates. Send one fresh verification link and show the same confirmation state without revealing whether the Account was created or reused.
- Use the heading **"Revisa tu correo"**.
- Explain that, if the registration can continue, instructions were sent to the submitted email address and the Client must open the newest link before signing in. Keep this public response neutral so it does not reveal whether the request created a self-registered Account, reused an Assistant-created pending Client, or encountered an incompatible Account.
- State that the link expires and that its email gives the deadline. A new self-registration verification link still expires after **24 hours**; an existing Assistant-created Client keeps its **7-day** activation-link flow.
- Show the submitted email address so a typo is visible.
- Provide a text action **"Cambiar correo"** beside that address. It lets the Client correct the unverified address without signing in, then returns to **Revisa tu correo** showing the corrected address. A successful correction invalidates every verification link sent to the old address and sends one new link to the corrected address with a fresh 24-hour lifetime.
- Provide a secondary **"Reenviar correo"** action and a text link **"Volver a iniciar sesión"**. A successful resend invalidates every older unused link for the existing pending flow and sends one new link with that flow's full lifetime; only the newest link works.
- Do not show the authenticated tab bar or route to Inicio from this state.
- The verification link itself does not open an authenticated session. After verification, the Client returns to `01` and signs in normally.

The resend-limit policy and the behavior when the Client no longer has the pending-registration flow open are not settled yet, so do not invent them in this design. **Cambiar correo** is authorized only by a valid continuation of the self-registration that created that pending Account. A public request that merely matches an Assistant-created pending Client must not gain permission to change the invited email or other existing data. Do not present this action as a way to change an activated Account's verified login email.

Preserve the existing login, biometric, registration, and referral-code frames and their visual styling. Apply follow-up 33's email-only correction at the same time; do not reintroduce phone as a signup or login identifier.
