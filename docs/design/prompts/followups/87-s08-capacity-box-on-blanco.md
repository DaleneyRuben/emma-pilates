# Follow-up — `S08`'s capacity summary box on Blanco

Targets: **Staff `S08`** (the background of the «N de M cupos disponibles»
box in its four frames, nothing else); **generated handoff
`design/README.md`** (one bullet added to «Seat pills (`03`, `06`, `S02`,
`S07`, `S08`, `S13`)»). Send [30](./30-invariants-checklist.md) alongside
this follow-up; like [84](./84-seat-pills-and-palette-text-tones.md) it is a
colour-only change that settles a value outside the closed palette's uses.
Colours change; no size, spacing, copy, or structure does.

---

Found by MOB-047 on 2026-10-06 and measured by MOB-048 with a script over
`design/S08 Detalle de Sesión (Asistente).dc.html`:

1. `S08` replaces `04`'s capacity bar with a summary box: «N de M cupos
   disponibles» in 15px `#4A4A4A` beside the seat pill («Con cupos» on
   `#EFE0DC`/`#7A4F4B`, «Completa» on `rgba(216,201,187,0.34)`/`#6E6663`
   since follow-up 84), in a row with gap 12, padding `16px 18px`, a 1px
   `#D8C9BB` border, radius 16, and no shadow. The three frames with seats
   («Teléfono · Cupos disponibles», «Teléfono · Sin clases en el plan»,
   «Tablet · Tarjeta centrada») fill the box with Éxito at 10%
   (`rgba(124,148,115,0.10)`), and «Teléfono · Clase llena» fills it with
   Error at 7% (`rgba(178,93,75,0.07)`).
2. The palette table reserves Éxito for confirmed, active, attended, and
   income, and Error for cancelled, overdue, no-show, and destructive. A
   Session with seats is none of the former and a full class is none of the
   latter: follow-up 84 settled that a full class is neutral («never Error
   red and never Éxito green») and that the pill's word carries the state.
   The box's tint says the same thing a second time, in colours the palette
   gives other meanings.
3. The box has the card's border and radius, so it is a card, and the
   «Cards (Client and Staff)» section says a card is Blanco. The apps draw
   every white card through one shared surface (MOB-039) and will draw this
   box as a flat Blanco card with the pill (MOB-048).

## 1. `S08` — the box's background

In the four frames, change the box's `background:rgba(124,148,115,0.10)`
(three frames) and `background:rgba(178,93,75,0.07)` («Teléfono · Clase
llena») to `background:#FFFFFF`. The box keeps its row layout, gap 12,
padding `16px 18px`, 1px `#D8C9BB` border, radius 16, no shadow, the 15px
`#4A4A4A` text, and the seat pill exactly as follow-up 84 left it.

## 2. README — a bullet under «Seat pills»

After the second bullet of «Seat pills (`03`, `06`, `S02`, `S07`, `S08`,
`S13`)», add:

> - `S08`'s capacity summary («N de M cupos disponibles» beside the pill) is
>   a flat Blanco card: 1px `#D8C9BB`, radius 16, padding 16px 18px, no
>   shadow. The pill alone carries the state, so the box takes no Éxito or
>   Error tint.

## What must remain untouched

Every other frame, size, padding, copy, and script of `S08`; the seat pill's
own colours, padding, and words; `04`, which keeps its bar; and every other
README section.
