# Follow-up — Unread notifications: the Perfil tab badge and the staff account avatar dot

Targets: **Client `02`, `18`; Staff `S02`, `S04`, `S11`, `S15`, `S23`;
Sistema de Diseño (Prompt 00); generated handoff `design/README.md`**. Send
[30](./30-invariants-checklist.md) alongside, with the corrections carried by
[31](./31-plan-naming-leftovers.md), [32](./32-design-system-navigation-drift-again.md),
[40](./40-cancellation-window-wording.md), [48](./48-insumos-record-restock.md) §6,
[59](./59-admin-review-design-findings.md), [67](./67-settle-invariant-9-profile-photo.md) §1,
and [70](./70-leftovers-of-the-2026-09-30-exports.md).

---

No screen says that a notification is waiting until the person opens
`19` or `S20`. MOB-017 shipped two indicators the design never drew: the
Client app counts unread notifications on the «Notificaciones» row of Perfil
(`18`), and the Staff app puts a dot on the «Tu cuenta» avatar of every role
root. The Client app has no tab-bar badge, so an unread notice stays hidden
until the Client opens Perfil. This follow-up draws one unread language for
both apps. Staff roles have no tab bar (checklist 30 §9 and the README's Staff
navigation), so their equivalent is the avatar dot.

## 1. The unread badge

- **Count badge:** an 18 px tall pill, minimum width 18 px, 0 5 px padding,
  filled **Palo de rosa profundo `#8A5D59`**, white Work Sans 11 px weight 600
  with tabular figures (5.54:1). It shows the number of unread notifications,
  and **«9+»** above nine. With nothing unread it is not drawn at all (no
  «0»).
- **Dot:** a 12 px `#8A5D59` circle with no number.
- Both carry a 2 px ring in the colour of the surface under them, so they
  separate from the icon or avatar they overlap.
- Not Error red. Red marks a rejected receipt and a cancelled class on `19`
  and `S20` (checklist 30 §8); an unread notice is not an error.

## 2. Client — the Perfil tab

- When the Client has unread notifications, the count badge sits on the
  **Perfil** tab icon, overlapping its top-right corner (top −4 px,
  right −9 px from the 23 px icon), with a white ring (the tab bar's colour).
  It shows on every screen that draws the tab bar, whichever tab is active.
  The tab keeps its label and colours; screen readers hear «Perfil, 2
  notificaciones sin leer».
- Draw it with **2** on `02`'s «Con plan activo» frame and on `18`'s «Perfil ·
  raíz de pestaña» frame. Every other frame that draws the tab bar shows the
  zero state and stays as it is.
- `02`'s header account avatar gets no dot: the tab badge is on the same
  screen.

## 3. Client — the «Notificaciones» row on `18`

In the «Perfil · raíz de pestaña» frame, the «Notificaciones» row shows the
count (**2**) right before its chevron, as a 22 px tall pill (minimum width
22 px, 0 6 px padding), `#8A5D59` with white Work Sans 12 px 600, no ring.
«Perfil · sin foto» shows the zero state. The row's height, icon, and label
stay as they are; the phone frame still fits 874 px without scrolling the tab
bar away.

## 4. Staff — the «Tu cuenta» avatar

- When the staff member has unread notifications, the dot sits on the
  avatar's top-right edge (top 0, right 0) with a 2 px ring in the header's
  background. It has no number: the avatar already carries two initials, and
  the count is one tap away on `S23`.
- Draw it on the first frame of each root: `S02` «iOS · Agenda del día»,
  `S04` «Teléfono · Resultados», `S11` «iOS · Bandeja de pagos», and `S15`
  «iOS · Evaluaciones próximas». The other frames show the zero state.
- The avatar's label stays **«Tu cuenta»**; screen readers hear «Tu cuenta,
  notificaciones sin leer».
- This amends checklist 30 §9 (30 is not edited): the dot is a state mark
  over the avatar, **not a border**. The avatar keeps its `#D8BDB8` fill, its
  two white Lora initials, no border, its place as the rightmost control, and
  its 10 px gap from the screen action.

## 5. Staff — the «Notificaciones» row on `S23`

In the «iOS · Entrenadora» frame (Camila, whose `S02` carries the dot), the
«Notificaciones» row shows the count pill of §3 (**2**) before its chevron.
The other frames show the zero state.

## 6. Sistema de Diseño

- **Navegación**, client tab bar sample: put the count badge (**2**) on the
  Perfil icon while Inicio stays the active tab, and add one line under the
  sample: «Perfil cuenta los avisos sin leer; desde 10 dice 9+ y sin avisos no
  se dibuja.» The four labels stay Inicio · Reservar · Mis Reservas · Perfil
  (32 §1).
- **Avatar de cuenta**: add a third card, **«Avatar con avisos sin leer»**,
  showing the root header with the dot on the avatar, captioned «El punto
  avisa que hay notificaciones sin leer; no es un borde y no lleva número.»
  Under the shape rule, add: «El punto de avisos sin leer no cambia la forma:
  el avatar sigue sin borde.»

## 7. `design/README.md`

- Client navigation: the four-tab bar carries the unread count on Perfil
  (§1, §2); `18`'s row and table entry mention the «Notificaciones» count.
- Staff navigation and the `S20` row: `S20` is reached from `S23`'s
  «Notificaciones» row and from a push. It is not «no menu entry»: `S23`
  draws that row (prompt `staff/23`). The root avatars carry the unread dot
  (§4), and the `S23` row says it lists the «Notificaciones» count.
- Components: add the count badge and the dot (§1) next to the admin counter
  badges, and say under Avatars that the dot is not a border.

## Preserve everything else

`19` and `S20` keep their unread tint and dot per entry. The admin web and
its counter badges, `S11`'s pending-payments count, every other tab and
avatar state, the screen eyebrows, and all copy and layout not named above
stay as they are.
