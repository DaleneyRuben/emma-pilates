# Follow-up — Email is the only authentication identifier

Targets: **Client `01`, `18`, `20`; Staff `S01`, `S05`, `S18`; Admin web `AW24`**. Apply the relevant targets in each surface's existing design session and send [30](./30-invariants-checklist.md) alongside this follow-up.

---

[ADR-0029](../../../adr/0029-manage-authentication-in-the-nestjs-backend.md) now requires every Account to have one unique email login identifier in the first release. A phone number may still be stored and displayed as optional profile/contact information, and Client search may still use it, but a phone number is never accepted in a login, signup-identity, or password-recovery field.

Apply these focused corrections:

## Client

- On `01` **Iniciar sesión**, change **"Correo electrónico o teléfono"** to **"Correo electrónico"**.
- On `01` **Registrarse**, change the combined field to required **"Correo electrónico"**. Do not add phone to this calm first-release registration form; a Client can add an optional phone later through `22` Editar perfil.
- On `20` **Recuperar contraseña**, change the field to **"Correo electrónico"**. The sent state always says **"Revisa tu correo"**; remove the alternate **"Revisa tus mensajes"** phone-number case.
- On `18` **Perfil**, always show the Account email in the summary. If the Client has added a phone, it may appear as a second contact line; never show a phone instead of the email.

## Staff mobile

- On `S01` **Iniciar sesión**, change **"Correo electrónico o teléfono"** to **"Correo electrónico"**.
- On `S18` **Recuperar contraseña**, change the field to **"Correo electrónico"**. The sent state always says **"Revisa tu correo"**; remove the alternate phone-message case.
- On `S05` **Nuevo cliente**, replace the combined field with a required **"Correo electrónico"** field and a separate optional **"Teléfono (opcional)"** contact field. The temporary-password flow stays exactly as designed.

## Admin web

- On `AW24` **Formulario de personal**, replace the combined field with a required **"Correo electrónico"** field and a separate optional **"Teléfono (opcional)"** contact field. Apply this to create and edit states. The Role, Branch assignment, and temporary-password behavior do not change.
- `AW01` Login and `AW30` Recuperar contraseña already use email only; leave them unchanged.

## Preserve everything else

Phone remains valid optional contact and search data on `22`, `S04`, `S06`, `S23`, `AW21`, `AW22`, and `AW23`. Do not remove those displays or search paths. Do not change biometrics, passwords, temporary-password replacement, referral-code behavior, navigation, spacing, or visual styling.

Treat this as a standing invariant from this export onward: **authentication and password recovery identify every Account by email only; phone is contact data only.**
