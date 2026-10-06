# Follow-up — The Home shortcut tiles, the Branch picker pill, and four row slips

Targets: **Client `02`** (the disabled «Reservar una clase» row in the «Sin
plan activo» frame, and the shadow of the three shortcuts in every frame);
**Client `03`** (the full card of the «Clase llena» frame); **Staff `S04`**
(the shadow of the result rows); **Staff `S13`** (the «Sucursal:» pill's
label colour); **generated handoff `design/README.md`** (two new sections
after «Row chevrons (Client and Staff)»). Send
[30](./30-invariants-checklist.md) alongside this follow-up; like
[80](./80-mobile-card-surface.md) it settles one value where the frames
disagree with each other or with the README.

---

Found by MOB-042 on 2026-10-06, inventorying the tappable rows of `02`,
`03`, `S02`, `S04`, `S07`, `S11`, `S13`, and `S15` with a script before the
apps draw them as the frames do:

1. `02`'s disabled «Reservar una clase» row (the «Sin plan activo» frame)
   rounds at 14px and fills `#F5F1EC`. Follow-up 80 settled one card radius
   (16) for every Client and Staff card, and `#F5F1EC` is outside the
   README's closed palette. The same row writes its note at 12px `#7A716D`
   where the enabled row's note is 13px `#766D69`, and sits 8px above the
   tile grid where the enabled row sits 12px above it.
2. The three shortcuts of `02` (every frame) and the result rows of `S04`
   shade at `0 2px 8px rgba(74,74,74,0.04)`; the README's card shadow is
   `rgba(74,74,74,0.05)`, and every other card on both screens uses it.
3. `S13`'s «Sucursal:» pill paints its label `#6E6663` with the name in
   `#4A4A4A`; the same pill on `03` and `S07` paints both in `#4A4A4A`.
4. `03`'s static «Clase llena» frame ends the full card's footer in a
   «Lista de espera» text link where `03`'s own interactive template, every
   full card of `S07`, and the README's «Row chevrons» section end every
   Session row in the 19px chevron (the Session detail offers the Waitlist).
5. The README describes neither the shortcut block of `02` nor the Branch
   picker pill of `03`, `S07`, and `S13`, which the apps now build from
   shared pieces.

## 1. `02` — the disabled shortcut row

In the «Sin plan activo» frame, change the disabled «Reservar una clase»
row to `border-radius:16px` and `background:#F2ECE5` (Arena). Its 1px
`#E7DCD8` border, its tile on `rgba(74,74,74,0.05)`, its `#B3A9A5` icon and
title, and its `#C4BAB6` lock stay. Change its note to
`font-size:13px;color:#766D69` (drop the `line-height:1.4`), matching the
enabled note, and the gap of the column that holds the row and the tile
grid from `8px` to `12px`.

## 2. `02` and `S04` — the card shadow

Change `box-shadow:0 2px 8px rgba(74,74,74,0.04)` to
`box-shadow:0 2px 8px rgba(74,74,74,0.05)` on the three shortcut buttons of
every `02` frame and on the result row template of `S04`.

## 3. `S13` — the pill's label

On the «Sucursal:» pill of both frames, change the button's `color:#6E6663`
to `color:#4A4A4A`; the `<strong>` keeps `#4A4A4A`.

## 4. `03` — the full card of «Clase llena»

Replace the «Lista de espera» span in that card's footer with the 19px
`#B78380` chevron the other cards draw (`width="19" height="19"`, stroke
1.3, polyline `9.5,5 16.5,12 9.5,19`). The «Lleno» pill and everything
else in the card stay.

## 5. README — two sections

After «Row chevrons (Client and Staff)», add:

### Home shortcuts (`02`)

- Under an 11px uppercase `0.16em` `#766D69` «Accesos rápidos» eyebrow, a
  full-width «Reservar una clase» card (padding 18, gap 14) holds a 44px
  tile on `rgba(216,189,184,0.28)` at radius 12 with a 22px `#B78380`
  calendar (stroke 1.3), the title in Lora 17 weight 500 over a 13px
  `#766D69` note, and the 19px chevron.
- Under it, two half-width cards in a 12px grid («Evaluación nutricional»,
  «Mis referidos»): a column (padding 18, gap 10) with a 22px `#B78380`
  icon, a Lora 16 weight-500 title, and a 12px `#766D69` note; no chevron.
- Without an active Plan the full-width card is disabled: Arena `#F2ECE5`
  with a 1px `#E7DCD8` border at the same radius 16, the tile on
  `rgba(74,74,74,0.05)`, the icon and title in `#B3A9A5`, the note unchanged,
  and the 19px `#C4BAB6` lock in place of the chevron.

### Branch picker pill (`03`, `S07`, `S13`)

- A 44px pill (1px `#D8C9BB`, Blanco, padding 0 16, gap 10, radius 999)
  with a 17px `#B78380` pin, «Sucursal: » and the Branch name in 14px
  `#4A4A4A` (the name at weight 500), and the 16px `#766D69` chevron
  pointing down; it opens the picker sheet above. `S13` offers «Todas las
  sucursales» as a name.

## Preserve everything else

Every other property of the four screens (the enabled shortcuts and the
two tiles of `02`, the Session cards and their pills, `S04`'s avatar and
texts, `S13`'s cards), every other screen, and every other README line.
