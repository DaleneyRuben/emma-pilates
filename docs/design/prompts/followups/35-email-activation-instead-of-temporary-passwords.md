# Follow-up — Activate staff-created Accounts by email

Targets: **Client `21`, `23`; Staff `S05`, `S19`, `S23`; Admin web `AW24`, `AW32`**. Send [30](./30-invariants-checklist.md), the still-pending [33](./33-email-only-authentication.md), and [34](./34-client-email-verification.md) alongside this follow-up.

---

[ADR-0029](../../../adr/0029-manage-authentication-in-the-nestjs-backend.md) replaces every temporary-password flow with an emailed activation link. An Assistant-created Client Account and an Administrator-created Staff Member Account begin inactive. The recipient opens a single-use link that verifies the required email address and lets that person create the Account's first password. Staff never see, copy, or relay a password.

The activation link expires after **7 days**. State that duration wherever the invitation or its expired state explains validity; do not use the 24-hour self-registration verification lifetime or the 30-minute password-recovery lifetime.

Apply these focused corrections:

## Staff mobile

- On `S05` **Nuevo cliente**, remove the generated **"Contraseña temporal"** field and **"Copiar"** action. Explain briefly that an activation link will be sent to the required email address. The create action sends that invitation.
- After `S05` successfully creates the still-pending Client Account, show the submitted email address and a **"Cambiar correo"** action for an authorized Assistant. Correcting it preserves the Client and Account, invalidates every activation link sent to the old address, and sends one new activation link to the corrected address with a fresh 7-day lifetime. Do not present this action after activation.
- If an Assistant submits the same email for the same Client creation flow while that Account is still pending, do not create another Account or Client. Show that the matching Client is awaiting activation, send one fresh activation link, and continue from that pending record without overwriting its existing details.
- If the email instead belongs to a self-registered pending Client, keep that existing Client and its verification flow. Tell the authorized Assistant that verification is pending, offer to send one fresh 24-hour verification link, and do not replace the Client's password, Referral, or other recorded details with values from `S05`.
- If the email belongs to a pending Staff Member, show an explicit conflict to the authorized Assistant and change nothing. Do not rotate the Staff Member's activation link or reveal its details beyond what is needed to resolve the conflict.
- Repurpose `S19` **Crea tu contraseña** as the page opened by an Administrator-created Staff Member's activation link. Remove every reference to first Login, a temporary password, or a forced post-Login step. Explain that creating the password activates the Account and verifies its email.
- On `S23` **Perfil**, keep the signed-in password-change flow but describe it as distinct from activation through `S19`, not from a forced first-Login step.

## Admin web

- On the create states of `AW24` **Formulario de personal**, remove the generated **"Contraseña temporal"** field and **"Copiar"** action. Explain briefly that an activation link will be sent to the required email address. Editing an existing Staff Member does not send a new activation link merely because the record is saved.
- Give the pending, not-yet-activated edit state of `AW24` a **"Cambiar correo"** action for an Administrator. Correcting it preserves the Staff Member and Account, invalidates every activation link sent to the old address, and sends one new activation link to the corrected address with a fresh 7-day lifetime. Do not show this as an ordinary email edit after activation.
- If an Administrator submits the same email for the same Staff Member creation flow while that Account is still pending, do not create another Account or Staff Member. Open the existing pending edit state, send one fresh activation link, and preserve the existing Role, Branch assignments, and other recorded details.
- If the email belongs to a pending Client, show an explicit conflict to the Administrator and change nothing. Do not convert that Client into a Staff Member or rotate the Client's verification or activation link.
- On `AW32` **Crear contraseña**, replace the temporary-password **Primer ingreso** variant with a **Desde una invitación** variant. It is opened from the activation email and explains that choosing a password activates the Account. Preserve the password-recovery-link and expired-link variants.

## Client mobile

- Repurpose `21` **Crea tu contraseña** as the page opened by an Assistant-created Client's activation link. Remove every reference to first Login, a temporary password, or a forced post-Login step. Explain that choosing a password activates the Account and verifies its email.
- On `23` **Cambiar contraseña**, keep the signed-in password-change flow but describe it as distinct from activation through `21`, not from a forced first-Login step.

After the recipient successfully creates the first password, show a brief confirmation and return to the appropriate Login screen: `01` for a Client, `S01` for a Staff Member using the mobile app, or `AW01` for an Administrator using the admin web. Activation must not create an authenticated session. Do not invent resend-limit values.

Preserve names, Roles, Branch assignment, email-only authentication, optional contact phone fields, responsive layout, password fields, validation, and visual styling. This follow-up supersedes follow-up 33 only where 33 says the temporary-password behavior remains unchanged; every email-only correction in 33 still applies.
