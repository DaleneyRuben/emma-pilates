# Follow-up — the notification permission sheet and the inbox's settings notice

Targets: **design system** (one new «Permiso de notificaciones» card); **Client
`19`** and **Staff `S20`** (one new frame each, «Notificaciones desactivadas»);
**generated handoff `design/README.md`** (a new «Push notifications» section).
Send [30](./30-invariants-checklist.md) alongside this follow-up. Every existing
frame stays as it is.

---

Written by NOT-002 on 2026-10-14. Both apps now receive push notifications
(ADR-0025). [ADR-0067](../../../adr/0067-request-notification-permission-in-context.md)
says the app never opens the system permission prompt cold: it first shows its
own short explanation right after an action that makes notifications useful,
and only a yes on that explanation opens the system prompt. Once the person
has denied permission, the app never asks again; the inbox offers a deliberate
way to the system settings instead. NOT-002 built both pieces with plain
components so the behaviour could ship; this follow-up gives them their design.

## 1. The permission sheet (design system card)

A bottom sheet over the screen that triggered it, in the same family as the
existing confirmation sheets (`05`'s and `15`'s cancel confirmations): Blanco
`#FFFFFF`, top corners at the frame radius, the warm `rgba(74,58,48,0.22)`
backdrop, 32 px padding, 16 px between items.

- Title, Lora display: «¿Te avisamos?»
- One paragraph of body text, which differs by app:
  - Client: «Activa las notificaciones para saber al momento si tu clase
    cambia, si se libera un cupo y antes de tu evaluación.»
  - Staff: «Activa las notificaciones para enterarte al momento de cambios en tu
    agenda y de lo que necesite tu atención.»
- The primary button «Activar notificaciones».
- The text button «Ahora no» under it.

Show the card twice, once per app's copy. The sheet appears on the Client after
«Reserva confirmada» (`05`'s confirmed state), after «Ya estás en la lista de
espera.» (`04`), and after «Evaluación confirmada» (`15`); on Staff it appears
over the role's home the first time it loads. «Ahora no» hides it for 30 days.
No illustration, no bell icon, no system-prompt mock-up.

## 2. The settings notice (`19` and `S20`)

Add one frame to each inbox, «Notificaciones desactivadas», copied from the
existing populated frame. Above the «Sin leer» section (or above the empty
state when there are no entries), a notice block: Palo de rosa tinte
background, the inset radius, 16 px padding, 8 px gap, holding

- the body text «Las notificaciones están desactivadas en este dispositivo.
  Actívalas para enterarte a tiempo de cambios y recordatorios.»
- the text button «Abrir Ajustes», left-aligned.

It is informative, not an error: no error colour, no icon, no dismiss control.

## 3. The handoff README

Add a «Push notifications» section after the inbox entries: the sheet's two
copies and when each app shows it (the triggers above, the 30-day «Ahora no»,
never once the system has an answer); the settings notice and that it appears
only while permission is denied; and that a tapped notification marks its
entry read and opens the same screen the inbox opens for it.

## What must not change

- Every existing frame of `04`, `05`, `15`, `19`, `S20`, and every role home.
- The inbox rows, sections, «Marcar leídas», and the empty states.
- The tab bar, the Perfil count, and the staff avatar dot.
