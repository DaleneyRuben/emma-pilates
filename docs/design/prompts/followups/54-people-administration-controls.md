# Follow-up — People administration controls the admin web now has

Targets: **AW21 (Clientes)**, **AW22 (Detalle de cliente)**, **AW23
(Personal)**, **AW24 (Formulario de personal)**. Send
[30](./30-invariants-checklist.md) (with the corrections carried by
[31](./31-plan-naming-leftovers.md) and [40](./40-cancellation-window-wording.md))
and the still-pending [33](./33-email-only-authentication.md),
[35](./35-email-activation-instead-of-temporary-passwords.md), and
[38](./38-authentication-email-throttling.md) alongside this follow-up.

---

WEB-004 built these four screens against `booking/CONTEXT.md`,
`system-identity/CONTEXT.md`, ADR-0029, ADR-0030, and the staff-management
rules of IDN-007. In a few places the screens draw a state the domain does not
have, or leave out one it does. Apply only the changes below.

## 1. `AW21` — A Client who never bought a Plan has nothing expired

A Subscription is active or expired (`booking/CONTEXT.md`, Subscription). A
Client who never held one has no Subscription at all, so «Expirado» would be
false for her.

- Keep «Activo» (Éxito pill) and «Expirado» (Error pill) as drawn.
- Add a third row state: Plan column «Sin plan activo» in Texto muy tenue and
  a neutral pill «Sin plan» (Divisor `#F2EBE2` fill, Texto secundario, the
  6 px dot in Texto muy tenue) for a Client who never had a Plan.
- The footer keeps follow-up 28's wording, «Mostrando 9 de 148 clientas»:
  rows on this page over every Client of the studio.

## 2. `AW22` — An Assistant-created Account that is still pending

An Assistant-created Client can hold a Plan and Bookings before she activates
her Account (`system-identity/CONTEXT.md`, Activation Link), so support needs
to see that state.

- Under «Cliente desde dd/mm/aaaa», for a pending Account only, add a small
  Advertencia-tinted box with the pill «Pendiente de activación» and one line:
  «Todavía no abrió el enlace del correo para crear su contraseña.» No action:
  the Assistant manages the invitation from the Staff app (`S05`/`S06`).
- The rest of the panel stays: contact, Plan with «5 de 8», Crédito as
  `Bs 1.050,00`, Referidos with the code chip, and the collapsed «Último plan
  vencido el dd/mm/aaaa.» line.

## 3. `AW23` — Activation status and an on-palette Role tag

- Add a fifth column **Estado** after «Sucursales»: «Activo» (Éxito pill),
  «Pendiente» (Advertencia pill) for someone who has not activated yet, and
  «Desactivado» (neutral pill) for an Account that was switched off.
- The Role tag's `#F4EDE4` fill is not in the closed palette; use Divisor
  `#F2EBE2` with the Borde `#E4D8CC` outline. It stays a tag, never a pill.
- The footer reads «Mostrando 1–8 de 11 miembros».

## 4. `AW24` — What an existing Staff Member's panel can change

IDN-007 gives the Administrator separate commands for the Role, the Branches,
resending the Activation Link, and deactivation. No command edits a name,
email, or phone after creation, and ADR-0029 rules out staff-assisted password
recovery.

- **Editar miembro**: draw «Nombre», «Correo», and «Teléfono» as read-only rows
  on Superficie `#FAF7F2` (label left, value right), not inputs. Keep the 2×2
  Role choice and the Branch chips.
- Remove **Restablecer contraseña**: every Account recovers its own password
  from `AW30`/`S18` by email.
- Under the Branch chips: «Si sacas una sucursal, sus sesiones ya asignadas no
  se reasignan solas.» and, for a Trainer, «Cámbialas de entrenadora en Horario
  antes de guardar.» When the backend refuses because the Trainer still leads
  upcoming Sessions, the panel says «Todavía tiene sesiones próximas o un
  horario semanal en esas sucursales. Cámbiale la entrenadora desde Horario y
  vuelve a intentarlo.»
- **Pending member** (not activated yet): above the Role, an Advertencia-tinted
  box with «Pendiente de activación», «El enlace vence el dd/mm/aaaa.», «Si no
  activa su cuenta en 30 días desde el último envío, la invitación se
  elimina.», and a secondary button **Reenviar enlace**. A suppressed resend
  says «Ya enviamos un correo a esa dirección hace poco. Inténtalo de nuevo en
  un momento.» (follow-up 38; no retry time is invented).
- Under **Guardar**, an Error text link **Desactivar cuenta** that asks first:
  «¿Desactivar a Emma Vargas?», «Cerramos todas sus sesiones y ya no podrá
  entrar. Su historial se conserva.», **Volver** / **Desactivar** (Error
  outline). After it, the page shows the Éxito line «Emma Vargas ya no tiene
  acceso: cerramos todas sus sesiones.»
- **Your own account** and a **deactivated** member open read-only, with one
  quiet note on Superficie: «Es tu cuenta: no puedes cambiar tu rol ni
  desactivarla desde aquí.» or «Esta cuenta está desactivada: ya no puede
  entrar.», the contact rows, and the Role and Branches as plain text.
- **Nuevo miembro** keeps follow-ups 33 and 35 (required «Correo electrónico»,
  «Teléfono (opcional)», no temporary password) with the helper «Le enviaremos
  un enlace de activación a este correo. Vence en 7 días.» After saving, the
  page shows «Invitación enviada a correo@…: tiene 7 días para activar su
  cuenta.»

## Preserve everything else

Do not change the shell, sidebar, Branch selector (still shown-and-ignored on
Clientes), AW21's search-only filter and no-results frame (follow-up 25), the
feminine counters (follow-up 28), AW23's one-at-a-time Role filter, or any
screen not named in Targets.
