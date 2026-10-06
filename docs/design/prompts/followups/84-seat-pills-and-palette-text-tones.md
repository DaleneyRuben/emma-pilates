# Follow-up — One seat-pill rule and the text tones outside the closed palette

Targets: **Client `03`, `05`, `06`, `08`, `09`, `15`, `16`, `19`, `01`,
`21`, `22`**; **Staff `S02`, `S03`, `S04`, `S06`, `S07`, `S08`, `S09`, `S10`,
`S11`, `S12`, `S13`, `S16`, `S20`, `S21`, `S22`, `S01`, `S05`, `S19`**;
**Admin web `AW01`, `AW03`, `AW24`**; **generated handoff
`design/README.md`** (a new «Seat pills» section after «Branch picker pill
(`03`, `S07`, `S13`)»). Send [30](./30-invariants-checklist.md) alongside
this follow-up; like [72](./72-app-outlined-button-labels.md) it is a
colour-only sweep that settles one value where the frames disagree with the
README's closed palette and with each other. Colours change; no size,
spacing, copy, or structure does.

---

Found by MOB-042 on 2026-10-06 and inventoried by MOB-045 with a script over
every `design/*.dc.html` (style attributes, SVG attributes, and the frames'
own scripts):

1. `#8A5F5C` is not in the README's closed palette, whose nearest tone is
   Palo de rosa profundo `#8A5D59`. It appears 90 times in the style
   attributes of 21 screen files, and once more in `03`'s script: the
   first-letter avatars of `S03`, `S04`, `S06`, `S07`, `S08`, `S09`, `S10`,
   `S11`, `S12`, `S21`, and `S22` and the two-letter ones of `16`; the seat
   pills of `03` and `06`; the «Más elegido» pill of `08` and the «8 clases»
   pill of `09`; the day-of-month column of `15`; the weekday tiles of
   `S16`; the «Arena:» strong of `19` and `S20`; and the date column of
   `05`. The apps draw `#8A5D59` (`primaryDeep`) in every one of these
   places.
2. The seat pill of a Session row is drawn three ways. `03` and `06`
   (`rgba(216,189,184,0.28)` with `#8A5F5C` for «N cupos»,
   `rgba(74,74,74,0.07)` with `#6E6663` for «Lleno»; `03`'s own note says
   «Lleno» is neutral grey and never red) and `S07` and `S08` (Éxito
   `rgba(124,148,115,0.16)`/`#5E7256` for three seats or more, Advertencia
   `rgba(201,154,78,0.16)`/`#8A6428` for two or fewer, Error
   `rgba(178,93,75,0.12)`/`#8A4433` for «Completa»; `S07`'s own note asks
   for parity with the Client's cards) and `S02` and `S13` (neutral
   `rgba(216,201,187,0.34)`/`#6E6663` for «Con cupos»/«N cupos», Éxito
   `rgba(124,148,115,0.16)`/`#5E7256` for «Completa»/«Llena»). None of the
   three text tones is in the palette, whose Éxito, Advertencia, and Error
   text tones are `#5F7457`, `#9A7434`, and `#94493A`.
3. The same three off-palette text tones remain outside the seat pills:
   `#5E7256` on the «Asistió» segments of `S03` and the «Activa»/«Asistió»
   pills of `S06` and `S10`; `#8A4433` on the «No asistió» segment of `S03`,
   the «Vencida»/«No asistió» pills and the expired line of `S06`, and the
   field error text of `01`, `21`, `22`, `S01`, `S05`, `S19`, `AW01`,
   `AW03`, and `AW24`. The apps draw `successText` `#5F7457` and
   `errorText` `#94493A` there.

## 1. One seat-pill rule (`03`, `06`, `S02`, `S07`, `S08`, `S13`)

A seat pill says how many places a Session still has, or that it has none.
Its word or number carries the state, so it is not a status pill and takes
no 6px dot. Draw every seat pill the same way:

- **Seats remain** («N cupos», «1 cupo», «Con cupos»): Palo de rosa tinte
  `#EFE0DC` behind Palo de rosa oscuro `#7A4F4B`, the pair the palette table
  reserves for badges and their text.
- **Full** («Lleno», «Completa», «Llena»): `rgba(216,201,187,0.34)` behind
  Texto secundario `#6E6663`, never Error red (`03`'s note: a full class is
  not an error, only capacity reached) and never Éxito green.

The pill keeps each frame's padding, radius, 12px size, and weight 500.
Change:

- `03`: in the script, `tagBg` to
  `s.spots === 0 ? "rgba(216,201,187,0.34)" : "#EFE0DC"` and `tagColor` to
  `s.spots === 0 ? "#6E6663" : "#7A4F4B"`; in the «Clase llena» frame, the
  two «N cupos» spans to `background:#EFE0DC;color:#7A4F4B` and the «Lleno»
  span to `background:rgba(216,201,187,0.34);color:#6E6663`.
- `06`: the `{{ o.spots }}` pill to `background:#EFE0DC;color:#7A4F4B`.
- `S07`: in the script, `tagBg` to
  `full ? "rgba(216,201,187,0.34)" : "#EFE0DC"` and `tagColor` to
  `full ? "#6E6663" : "#7A4F4B"` (the `low` branch disappears); the two
  static «Completa» spans to `background:rgba(216,201,187,0.34);color:#6E6663`
  and the four «N cupos» spans to `background:#EFE0DC;color:#7A4F4B`; the
  «Cupos» note to «Palo de rosa tinte mientras queden cupos; neutro cuando
  está completa, nunca en rojo ni en verde: no es un error, solo capacidad
  completa, como en 03.».
- `S08`: the «Completa» span to `background:rgba(216,201,187,0.34);color:#6E6663`
  and the three «Con cupos» spans to `background:#EFE0DC;color:#7A4F4B`.
- `S02` and `S13`: in the scripts, `tagBg` to
  `full ? "rgba(216,201,187,0.34)" : "#EFE0DC"` and `tagColor` to
  `full ? "#6E6663" : "#7A4F4B"`; the static «Completa»/«Llena» spans to
  `background:rgba(216,201,187,0.34);color:#6E6663` and the static «Con
  cupos»/«N cupos» spans to `background:#EFE0DC;color:#7A4F4B`.

## 2. `#8A5F5C` → `#8A5D59`

Replace every `#8A5F5C` with `#8A5D59` in the 21 files of point 1 above,
the script of `03` included. Nothing else about those elements changes.

## 3. The remaining Éxito, Advertencia, and Error text tones

After §1, replace every remaining `#5E7256` with `#5F7457`, every
`#8A6428` with `#9A7434`, and every `#8A4433` with `#94493A`, on the
screens listed in point 3 above. Backgrounds, borders, and dots keep their
current values.

## 4. README — a «Seat pills» section

After «Branch picker pill (`03`, `S07`, `S13`)», add:

> ### Seat pills (`03`, `06`, `S02`, `S07`, `S08`, `S13`)
>
> - The pill on a Session row or detail says how many places remain or that
>   none does; the number or word carries the state, so it takes no dot.
> - Seats remain («N cupos», «Con cupos»): Palo de rosa tinte `#EFE0DC`
>   behind Palo de rosa oscuro `#7A4F4B`, the badge pair of the palette
>   table. Full («Lleno», «Completa», «Llena»): `rgba(216,201,187,0.34)`
>   behind Texto secundario `#6E6663`, never Error red and never Éxito
>   green. 12px, weight 500, fully rounded.

## What must remain untouched

Every size, padding, radius, shadow, copy, and layout; the avatars' tinted
circles (`rgba(216,189,184,0.4)` and `rgba(216,189,184,0.34)`), the Éxito,
Advertencia, and Error pill and notice backgrounds, and the `#B25D4B` and
`#7C9473` borders of `S03`'s segments. The apps' seat pills are reconciled
in their own backlog row, not here.
