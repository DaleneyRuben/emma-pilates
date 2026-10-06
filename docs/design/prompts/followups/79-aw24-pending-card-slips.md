# Follow-up — `AW24`'s pending card: the pill's text tone and the sample expiry

Targets: **admin web `AW24`** (the six pending frames: «Pendiente de
activación», «Cambiar correo», the two limited states, and the two «Nuevo
miembro» outcomes that draw the pending card). Send
[30](./30-invariants-checklist.md) alongside this follow-up; it applies
checklist 30 §1 (closed palette) and keeps
[54](./54-people-administration-controls.md)'s date rule.

---

Found by WEB-015 on 2026-10-06, comparing the pending card with the admin
web, which already draws both corrections:

1. The «Pendiente de activación» pill is `rgba(201,154,78,0.16)` with its
   text in `#8A6A30`, a colour outside the closed palette. The other 84
   advertencia pills on the admin screens (and the warning counter badge in
   the sidebar) use Advertencia texto `#9A7434`.
2. The sample expiry line reads «El enlace vence el 6 de octubre a las
   10:40.», while follow-up 54 fixed the line as «El enlace vence el
   dd/mm/aaaa.» and the admin web formats every date as `dd/mm/aaaa` with no
   time.

## 1. The pill

In the six pending-card pills of `AW24`, change `color:#8A6A30` to
`color:#9A7434`. Background, dot, size, weight, and label stay.

## 2. The expiry line

In the same six cards, change «El enlace vence el 6 de octubre a las 10:40.»
to «El enlace vence el 06/10/2026.».

## Preserve everything else

Every other frame of `AW24`, every other property of the pending card, every
other screen, and every README line.
