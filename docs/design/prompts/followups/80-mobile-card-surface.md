# Follow-up — One card surface on the Client and Staff screens

Targets: **generated handoff `design/README.md`** (the token table, the
«Spacing, radius, shadow» list, and a new «Cards (Client and Staff)»
section); **Client `02`, `03`, `06`, `10`, `11`, `13`, `14`, `16`; Staff
`S04`, `S05`, `S06`, `S08`, `S10`, `S21`, `S22`** (radius and one title size
only). Send [30](./30-invariants-checklist.md) alongside this follow-up; it
settles a token-table gap the way [72](./72-app-outlined-button-labels.md)
and [74](./74-picker-sheet-selected-row.md) did.

---

Every Client and Staff frame draws its cards the same way: Blanco, a 1 px
Borde fuerte `#D8C9BB`, radius 16, and under most of them the soft shadow
`0 2px 8px rgba(74,74,74,0.05)` (221 of the 461 white boxes inside the 188
device frames, counted on 2026-10-06). The README does not say so: its token
table gives Borde fuerte to «Frame borders, input borders» and Borde
`#E4D8CC` to «Card and table borders», and its radius line keeps cards at
«10–12px», which is the admin web's table card, not the mobile card. The
apps draw the mobile card from one shared surface since MOB-039 (2026-10-06),
so the handoff must name it.

A few frames also round the same card differently: 14 px on `02`'s three
shortcut tiles, `10`'s attachment box, `11`'s plan summary, `13`'s
nutritionist card and «Tu última evaluación», `14`'s reminder note, `16`'s
«Tu crédito» tile, and the tablet result rows of `S04`, `S06`, `S21`, and
`S22`; 18 px on `S06`'s plan card, `S08`'s facts card, `S10`'s summary
cards, and `S06`'s «Sin plan activo» box; 20 px on the centred tablet cards
of `S05`, `S08`, and `S10`. The empty-state boxes of `03`, `06`, and `16`
title themselves in Lora 18 where `S06`'s uses Lora 19. The apps draw all of
them at 16 and the empty-state title at 19.

## 1. README — token table and radius line

- Borde fuerte: «Frame borders, input borders, Client and Staff card
  borders».
- Borde: «Admin-web card and table borders».
- Radius: «8px controls, 10–12px admin-web cards and panels, 16px Client and
  Staff cards and empty states, 14–16px outer frames, 999px pills».
- Shadows: add «Client and Staff card `0 2px 8px rgba(74,74,74,0.05)`»
  before «card hover».

## 2. README — a «Cards (Client and Staff)» section

After «Picker sheets (Client and Staff)», add:

- A card is Blanco, 1 px `#D8C9BB`, radius 16, padding 18–20 px, with the
  shadow `0 2px 8px rgba(74,74,74,0.05)`. The cards drawn without the shadow
  stay flat: `12`'s dates, `17`'s origin, `S03`'s roster, `S05`'s pending
  card, `S06`'s history, `S12`'s receipt and summary, and `S23`'s groups.
- A selectable card marks selection by its border alone: 2 px `#B78380`
  (`06`'s and `08`'s options) or 1 px `#B78380` (`S15`).
- Chips and day pickers round at 12, notices at 10, inputs at 8; none of
  them is a card.
- An empty state is a dashed 1 px `#D8C9BB` box, radius 16, on
  `rgba(216,201,187,0.14)`, centred: a 26 px `#B78380` line icon, a Lora 19
  weight-500 title, and a 13 px `#766D69` note (`03`, `06`, `16`, `S06`).
  The tablet's empty right panel (`S04`) draws no box: the person icon in a
  64 px circle (1 px `#D8C9BB` on `rgba(216,201,187,0.18)`), a Lora 22
  weight-400 title, and a 14 px `#766D69` helper line up to 340 px wide.

## 3. The frames — radius 16 and Lora 19

- Change `border-radius` to `16px` on every white, `#D8C9BB`-bordered box
  listed above that is 14, 18, or 20 px today, and on `S06`'s dashed «Sin
  plan activo» box. Chips, day pickers, inputs, notices, pills, sheets,
  avatars, and the device bezels keep their radius.
- Change the empty-state title of `03`, `06`, and `16` from 18 px to 19 px.

## Preserve everything else

Every other property of those boxes (fill, border, padding, shadow, content,
copy, and sample values), every other frame, every admin-web screen, and
every other README line.
