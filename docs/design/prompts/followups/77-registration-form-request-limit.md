# Follow-up — The registration form's request limit

Targets: **Client `01`; generated handoff `design/README.md` (the `01` row
and the Client navigation bullet on registration)**. Send
[30](./30-invariants-checklist.md) alongside, with the corrections carried by
[31](./31-plan-naming-leftovers.md), [32](./32-design-system-navigation-drift-again.md),
[40](./40-cancellation-window-wording.md), [48](./48-insumos-record-restock.md) §6,
[59](./59-admin-review-design-findings.md), [67](./67-settle-invariant-9-profile-photo.md) §1,
[70](./70-leftovers-of-the-2026-09-30-exports.md), and
[73](./73-unread-notifications-badge.md) §4. It extends
[38](./38-authentication-email-throttling.md)'s limit states to the one request that
still has none.

---

Registration, verification resend, email correction, and recovery share a
device budget and a network budget besides the per-address one (ADR-0029,
budgets set by BE-012 on 2026-10-01). A full budget answers `429`
`authentication_email_throttled` with the server's wait (`Retry-After`) and
sends nothing. `01` draws that limit on «Revisa tu correo» (resend and
«Cambiar correo»), but not on the registration form itself, where «Crear
cuenta» meets the same budget: the Client app shows the generic red «No
pudimos crear la cuenta. Inténtalo de nuevo.» and invites retries the server
keeps refusing (MOB-032). The limit is about this device or network, never
about the address, so the state must stay neutral and must not say whether
the email has an Account.

## 1. The new frame

Add one iOS frame right after «iOS · Registrarse · no coinciden», captioned
**«iOS · Registrarse · límite temporal»** / **«Límite del dispositivo o de la
red · nada se envía · "Crear cuenta" se reactiva al terminar la espera»**.

It is the «iOS · Registrarse» form (the Emma brand block, Nombre «Lucía
Mendoza», Correo electrónico «lucia.mendoza@correo.com», Contraseña and
Confirmar contraseña both filled and matching, no field error, «¿Tienes un
código de referido?» collapsed, the footer «¿Ya tienes una cuenta? Inicia
sesión») with two changes:

- **Above the first field**, where Login's «iOS · Demasiados intentos» puts
  its notice, the same neutral clock notice used by every limit on this
  screen: `role="status"`, 1 px `#D8C9BB` border, 10 px radius, the
  `rgba(216,189,184,0.16)` tint, the `#B78380` 18 px clock, then
  **«Demasiadas solicitudes. Intenta de nuevo en un momento; si ya recibiste
  un enlace, sigue sirviendo.»** (14 px, Texto) and **«Podrás intentarlo en
  14:56.»** (13 px, `#6E6663`, tabular figures). This is the recovery
  wording of `20` (a person who registered before may already hold a link,
  and nothing changed it) with the «Podrás intentarlo en» countdown that
  Login and «Cambiar correo» use for retrying the same action; the sample
  wait is the real one, close to 15 minutes.
- **«Crear cuenta»** in the disabled style of Login's limit frame
  (`#E7DCD8` fill, `#B3A9A5` label, no shadow) until the wait ends; then the
  notice disappears and the button is enabled again. The fields keep what the
  person typed.

No red anywhere in this frame: no Error-tone border, dot, or text, and no
«No pudimos crear la cuenta» line. Keep the frame inside the 874 px device;
if it does not fit, reduce the gap between the brand block and the form, not
the fields.

## 2. README

- `01` row: append «, and the registration form's temporary device or network
  limit».
- Client navigation, the bullet that starts «`01→20` via …»: append «When the
  device or network request limit is full, the registration form shows the
  neutral clock notice above the fields («Demasiadas solicitudes. Intenta de
  nuevo en un momento; si ya recibiste un enlace, sigue sirviendo.», «Podrás
  intentarlo en m:ss.») and keeps «Crear cuenta» disabled until the wait
  ends; nothing is sent and the address is never named.»

## Preserve everything else

Every existing `01` frame, its copy, sample values, and colours (the
«Registrarse» frames, «Credenciales incorrectas», «Demasiados intentos», and
the «Revisa tu correo» states); `20`, `21`, `S01`, `S18`, `AW01`, `AW30`;
every other README line.
