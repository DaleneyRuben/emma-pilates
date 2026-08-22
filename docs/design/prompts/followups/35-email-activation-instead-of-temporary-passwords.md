# Follow-up — Activate staff-created Accounts by email

Targets: **Client `21`, `23`; Staff `S05`, `S19`, `S23`; Admin web `AW24`, `AW32`**. Send [30](./30-invariants-checklist.md), the still-pending [33](./33-email-only-authentication.md), and [34](./34-client-email-verification.md) alongside this follow-up.

---

[ADR-0029](../../../adr/0029-manage-authentication-in-the-nestjs-backend.md) replaces every temporary-password flow with an emailed activation link. An Assistant-created Client Account and an Administrator-created Staff Member Account begin inactive. The recipient opens a single-use link that verifies the required email address and lets that person create the Account's first password. Staff never see, copy, or relay a password.

Apply these focused corrections:

## Staff mobile

- On `S05` **Nuevo cliente**, remove the generated **"Contraseña temporal"** field and **"Copiar"** action. Explain briefly that an activation link will be sent to the required email address. The create action sends that invitation.
- Repurpose `S19` **Crea tu contraseña** as the page opened by an Administrator-created Staff Member's activation link. Remove every reference to first Login, a temporary password, or a forced post-Login step. Explain that creating the password activates the Account and verifies its email.
- On `S23` **Perfil**, keep the signed-in password-change flow but describe it as distinct from activation through `S19`, not from a forced first-Login step.

## Admin web

- On the create states of `AW24` **Formulario de personal**, remove the generated **"Contraseña temporal"** field and **"Copiar"** action. Explain briefly that an activation link will be sent to the required email address. Editing an existing Staff Member does not send a new activation link merely because the record is saved.
- On `AW32` **Crear contraseña**, replace the temporary-password **Primer ingreso** variant with a **Desde una invitación** variant. It is opened from the activation email and explains that choosing a password activates the Account. Preserve the password-recovery-link and expired-link variants.

## Client mobile

- Repurpose `21` **Crea tu contraseña** as the page opened by an Assistant-created Client's activation link. Remove every reference to first Login, a temporary password, or a forced post-Login step. Explain that choosing a password activates the Account and verifies its email.
- On `23` **Cambiar contraseña**, keep the signed-in password-change flow but describe it as distinct from activation through `21`, not from a forced first-Login step.

Do not invent the post-success route yet. Architecture still needs to decide whether successful activation creates an authenticated session or returns the person to Login. Likewise, do not invent link-expiration or resend-limit values.

Preserve names, Roles, Branch assignment, email-only authentication, optional contact phone fields, responsive layout, password fields, validation, and visual styling. This follow-up supersedes follow-up 33 only where 33 says the temporary-password behavior remains unchanged; every email-only correction in 33 still applies.
