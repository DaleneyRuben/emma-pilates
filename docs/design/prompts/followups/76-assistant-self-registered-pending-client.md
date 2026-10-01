# Follow-up — `S06` for a pending Client who registered herself

Targets: **Staff `S05`, `S06`; generated handoff `design/README.md` (the
`S05`/`S06` rows and the Staff navigation bullets)**. Send
[30](./30-invariants-checklist.md) alongside, with the corrections carried by
[31](./31-plan-naming-leftovers.md), [32](./32-design-system-navigation-drift-again.md),
[40](./40-cancellation-window-wording.md), [48](./48-insumos-record-restock.md) §6,
[59](./59-admin-review-design-findings.md), [67](./67-settle-invariant-9-profile-photo.md) §1,
[70](./70-leftovers-of-the-2026-09-30-exports.md), and
[73](./73-unread-notifications-badge.md) §4. It completes
[68](./68-assistant-pending-invitation-on-client-overview.md), which moved the
pending invitation to `S06` but drew only a staff invitation.

---

A Client can register herself in the Client app and leave her email
unverified. Her Account is pending, but it was never an Assistant's
invitation: it already has a password, so an activation link would be useless
to her (the System Identity glossary: a self-registering Client proves her
email through a Verification Link; an Activation Link is for a staff-created
Client and creates the first password). `S05` already draws her case
(«Teléfono · Verificación pendiente»: S05 offers «Enviar enlace de
verificación» and «Ver cliente»), but `S06` draws only the invitation card
(«Cuenta pendiente de activación», «Reenviar enlace», «Cambiar correo»,
«Cancelar invitación»), so the overview that «Ver cliente» or a search in
`S04` opens has no frame for her. The Staff app has shown `S05`'s offer on
`S06` since MOB-027 (2026-10-01); this follow-up draws it.

The sample Client is the one `S05`'s frame uses: **Renata Áñez Suárez**,
+591 707 44821, `renata.anez@correo.com`, no plan.

## 1. `S06` phone frames

Add three phone frames after «Teléfono · Con pagos o reservas» and before the
tablet frame. Each is the «Teléfono · Cuenta pendiente» frame (header with
Renata's initial, name, and phone; the «Sin plan activo» card; «Registrar pago
en efectivo», the disabled «Reservar clase» with its note; «Ver reservas» and
«Ver historial») with the invitation card replaced by a **verification card**
on the same Advertencia tint (`rgba(201,154,78,0.12)`, 16 px radius, 18 px
padding, 12 px gap). The card has no title, no «Cambiar correo», and no
«Cancelar invitación», and it never offers «Ver cliente» (`S06` already shows
her):

- `S05`'s copy word for word: **«Este correo ya se registró desde la app y
  espera verificación. No cambiamos sus datos ni su contraseña.»** (14 px,
  Texto), the email on its own line (15 px, Texto, weight 500, wraps
  anywhere), and **«Puedes enviarle un enlace de verificación nuevo, válido por
  24 horas. Los anteriores dejan de funcionar.»** (13 px, `#6E6663`).
- A full-width primary **«Enviar enlace de verificación»** (48 px, `#B78380`,
  white label), the one action.

The three frames:

1. **«Teléfono · Se registró sola»** / **«Cuenta creada desde la app, sin
   verificar · sin invitación · desaparece al verificar»**: the card as above.
2. **«Teléfono · Verificación enviada»** / **«Tras "Enviar enlace de
   verificación" · los enlaces anteriores dejan de funcionar»**: the line
   **«Enviamos un enlace de verificación nuevo.»** between the note and the
   button, in the style of «Teléfono · Enlace reenviado» (13.5 px, Éxito text
   `#5F7457`, `role="status"`); the button stays enabled.
3. **«Teléfono · Verificación limitada»** / **«Límite temporal del servidor ·
   el enlace vigente sigue sirviendo»**: between the note and the button, the
   white clock notice of «Teléfono · Reenvío limitado», unchanged in shape and
   tone (the `#B78380` 18 px clock, **«Ya enviamos un correo a esa dirección
   hace poco. El enlace vigente sigue sirviendo.»**, **«Podrás reenviarlo en
   0:40.»** in tabular figures); the button in its disabled style
   (`#E4DAD0` border, `#B9AFA9` label, as «Reenviar enlace» there) until the
   wait ends. Neutral, never Error red.

## 2. `S06` tablet frame

Add one tablet frame after the existing one, captioned **«Tablet · Se
registró sola»** / **«La misma tarjeta en el panel derecho · la búsqueda
permanece a la izquierda»**. It is the existing tablet frame with: Renata's
row selected in the list (the selected border and tint move from Paola to
her); the right panel's header showing «R», «Renata Áñez Suárez», and
«+591 707 44821 · renata.anez@correo.com»; under it, the verification card of
§1 at the panel's full width in its **sent** state; below the card, the
existing two-column row with the «Sin plan activo» dashed card in place of the
plan card and the same three-item action column («Registrar pago en
efectivo», disabled «Reservar clase», «Necesita un plan activo para
reservar.»). She has no classes yet, so the «Historial» block is not drawn.

## 3. `S06` notes

In the notes grid, add after «Invitación pendiente» a card **«Se registró
sola»**: «Si la clienta creó su cuenta desde la app y aún no verificó el
correo, no hay invitación: la tarjeta repite el aviso de S05 y solo ofrece
"Enviar enlace de verificación" (24 horas; los anteriores dejan de
funcionar). Sin "Cambiar correo" ni "Cancelar invitación". Desaparece al
verificar.»

## 4. `S05` «Ver cliente»

The «Teléfono · Verificación pendiente» frame keeps its drawing; its caption's
second line becomes **«Se registró sola desde la app · no se tocan sus datos ·
"Ver cliente" abre su S06 con la misma oferta»**.

## 5. README

- `S05` row: append «; the self-registered state's «Ver cliente» opens her
  `S06`».
- `S06` row: «Front desk — also manages a pending invitation, or offers a new
  verification link to a pending Client who registered herself».
- Staff navigation, the `S05` bullet: after «it also draws the self-registered
  and other-account states», add «(the self-registered state's «Ver cliente»
  opens her `S06`)».
- Staff navigation, the `S06` bullet: append «A pending Client who registered
  herself has no invitation: `S06` shows `S05`'s verification notice with
  «Enviar enlace de verificación» only (sent and limited lines as above), on
  the phone and in the tablet's right panel, until she verifies.»

## Preserve everything else

Every existing `S05` and `S06` frame, its copy and colours (including
«Teléfono · Cuenta pendiente», «Reenvío limitado», and the existing tablet
frame); the other notes cards; `S04` and every other screen; the README's
other rows and bullets.
