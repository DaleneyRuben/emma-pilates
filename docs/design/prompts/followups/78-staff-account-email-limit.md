# Follow-up — The staff Account's email limit

Targets: **Staff `S05`, `S06`; admin web `AW24`; generated handoff
`design/README.md` (the `S05`, `S06`, and `AW24` navigation bullets)**. Send
[30](./30-invariants-checklist.md) alongside, with the corrections carried by
[31](./31-plan-naming-leftovers.md), [32](./32-design-system-navigation-drift-again.md),
[40](./40-cancellation-window-wording.md), [48](./48-insumos-record-restock.md) §6,
[59](./59-admin-review-design-findings.md), [67](./67-settle-invariant-9-profile-photo.md) §1,
[70](./70-leftovers-of-the-2026-09-30-exports.md), and
[73](./73-unread-notifications-badge.md) §4. It adds a second limit state next to
the per-address ones that [38](./38-authentication-email-throttling.md),
[54](./54-people-administration-controls.md), [68](./68-assistant-pending-invitation-on-client-overview.md),
and [76](./76-assistant-self-registered-pending-client.md) drew.

---

Every staff command that can email an activation or verification link now
counts against a budget of the signed-in staff Account (ADR-0029's «broader
source limits» for authorized staff, set by BE-013 on 2026-10-01: 20 in 15
minutes and 100 in 24 hours, shared by creating a Client, «Reenviar enlace»,
«Cambiar correo», and «Enviar enlace de verificación» in the Staff app, and by
creating a Staff Member, resending, and correcting the email in `AW24`). A
full budget answers `429` `staff_email_throttled` with the server's wait and
sends nothing; no link changes.

The screens only draw the per-address limit («Ya enviamos un correo a esa
dirección hace poco. El enlace vigente sigue sirviendo.»), which is wrong
here: the address may never have been emailed, as when the Assistant creates
a brand-new Client. The apps show a generic red failure instead and invite
retries the server keeps refusing. The new state tells the staff member that
the limit is theirs; staff interfaces may say so (ADR-0029).

The copy, in every new frame:

- **«Enviaste muchos correos en poco tiempo. Espera un momento para enviar
  otro; los enlaces que ya enviaste siguen sirviendo.»**
- the countdown **«Podrás enviarlo en 14:52.»** where the action re-sends
  (`S06`, `AW24`'s pending panel), and **«Podrás intentarlo en 14:52.»** on a
  creation form (`S05`, `AW24`'s new member), the same split as `01` and `20`
  in 77. The sample wait is close to the real 15-minute window.

The notice is the existing neutral clock notice of each surface, never red:
`role="status"`, 1 px `#D8C9BB` border, 10 px radius, the
`rgba(216,189,184,0.16)` tint, the `#B78380` 18 px clock, the message in 14
px Texto and the countdown in 13 px `#6E6663` with tabular figures, exactly
as `S06`'s «Teléfono · Reenvío limitado» and `AW24`'s «Escritorio · Pendiente
· reenvío limitado» draw it.

## 1. `S05` — one new phone frame

After «Teléfono · Correo de otra cuenta», add **«Teléfono · Límite de tu
cuenta»** / **«Límite de correos de tu cuenta · nada se envía ni se crea ·
"Crear cuenta" se reactiva al terminar la espera»**: the «Teléfono ·
Formulario» frame with Nombre «Renata Áñez Suárez», Correo electrónico
«renata.anez@correo.com», and Teléfono (opcional) «+591 707 44821» filled, no
field error, the notice with «Podrás intentarlo en 14:52.» between the
«Nuevo cliente» heading and the first field, and «Crear cuenta» in the
disabled style of `01`'s limit frames (`#E7DCD8` fill, `#B3A9A5` label, no
shadow). The fields keep what she typed. Keep the frame inside the 874 px
device.

## 2. `S06` — one new phone frame

After «Teléfono · Reenvío limitado», add **«Teléfono · Límite de tu cuenta»**
/ **«Límite de correos de tu cuenta · igual en "Cambiar correo" y en la
verificación · el enlace vigente sigue sirviendo»**: the same frame (Renata
Áñez Suárez, her pending-invitation card, the plan and actions below), with
only the notice's two lines changed to the new copy and «Podrás enviarlo en
14:52.», and «Reenviar enlace» disabled as in «Reenvío limitado».

## 3. `AW24` — two new desktop frames

- After «Escritorio · Pendiente · reenvío limitado», add **«Escritorio ·
  Pendiente · límite de tu cuenta»** / **«Límite de correos de tu cuenta ·
  igual al cambiar el correo · el enlace vigente sigue sirviendo»**: the same
  panel (Lucía Vaca, pending), with only the notice's two lines changed to the
  new copy and «Podrás enviarlo en 14:52.», and «Reenviar enlace» disabled as
  in the frame it copies.
- After «Escritorio · Nuevo miembro · ya estaba pendiente», add
  **«Escritorio · Nuevo miembro · límite de tu cuenta»** / **«Límite de
  correos de tu cuenta · nada se envía ni se crea · "Guardar" se reactiva al
  terminar la espera»**: the «Nuevo miembro» panel filled (Nombre «Lucía
  Vaca», Correo electrónico «lucia.vaca@emmapilates.bo», Rol Asistente,
  Sucursal Equipetrol), the notice with «Podrás intentarlo en 14:52.» at the
  top of the panel body where the pending frames put theirs, and «Guardar» in
  the design system's disabled primary style.

## 4. README

- `S05` bullet (the one that starts «`S05` sends an activation link…»):
  append «When the staff Account's email limit is full, the form shows the
  neutral clock notice above the fields («Enviaste muchos correos en poco
  tiempo. Espera un momento para enviar otro; los enlaces que ya enviaste
  siguen sirviendo.», «Podrás intentarlo en m:ss.») and keeps «Crear cuenta»
  disabled until the wait ends; nothing is created or sent.»
- `S06` bullet: after «(a limited resend shows the server-provided wait and
  keeps the current link)», add «; the staff Account's own email limit uses
  the same notice with «Enviaste muchos correos en poco tiempo…» and «Podrás
  enviarlo en m:ss.», for «Reenviar enlace», «Cambiar correo», and «Enviar
  enlace de verificación» alike».
- `AW24` bullet: after «a suppressed resend shows the server-provided wait»,
  add «, and the Administrator's own email limit shows «Enviaste muchos
  correos en poco tiempo…» with «Podrás enviarlo en m:ss.» on the pending
  panel or «Podrás intentarlo en m:ss.» and a disabled «Guardar» on the new
  member form».

## Preserve everything else

Every existing `S05`, `S06`, and `AW24` frame, its copy, sample values, and
colours (in particular the per-address «Ya enviamos un correo a esa dirección
hace poco…» frames, which stay as they are); every other screen; every other
README line.
