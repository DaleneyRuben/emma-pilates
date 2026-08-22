# Follow-up — Complete email password recovery

Targets: **Client `20`, `21`; Staff `S18`, `S19`; Admin web `AW30`, `AW32`**. Send [30](./30-invariants-checklist.md), the still-pending [33](./33-email-only-authentication.md), [34](./34-client-email-verification.md), and [35](./35-email-activation-instead-of-temporary-passwords.md) alongside this follow-up.

---

[ADR-0029](../../../adr/0029-manage-authentication-in-the-nestjs-backend.md) uses an emailed single-use reset link as the normal password-recovery channel for every Account. [ADR-0030](../../../adr/0030-use-opaque-server-side-authentication-sessions.md) requires successful recovery to revoke every old Authentication Session and create one new Authentication Session for the app or browser that completed the reset.

Apply these focused corrections:

- Keep `20`, `S18`, and `AW30` as the email reset-link request screens. Apply follow-up 33 so the mobile forms accept email only and every sent state says **"Revisa tu correo"**.
- Give `21`, `S19`, and `AW32` two explicit link-entry variants: **Activar cuenta** for the activation link from follow-up 35, and **Restablecer contraseña** for a password-recovery link.
- The recovery variant uses **"Crea una contraseña nueva"**, the existing new-password and confirmation fields, and the same mismatch validation. It must not mention activation, email verification, an invitation, first Login, or a temporary password.
- Preserve an expired-link state without inventing a duration. Its action returns to the matching recovery-request screen: `20`, `S18`, or `AW30`.

The success destinations intentionally differ:

- Account activation creates no session and returns to Login, as specified by follow-up 35.
- Password recovery creates the one replacement Authentication Session required by ADR-0030. Route a Client to `02`, a Staff Member to the appropriate Role home (`S02`, `S04`, `S11`, or `S15`), and an Administrator completing recovery in the admin web to `AW02`.

Preserve the existing responsive layout, visual styling, password fields, validation, and neutral request response. Do not add SMS, WhatsApp, phone recovery, or staff-assisted recovery.
