# Follow-up — The history rows between rules, and the two quiet tones the README lacks

Targets: **generated handoff `design/README.md`** (the colour table and a
new «Lists between rules (Client and Staff)» section after «Cards (Client
and Staff)»); **Staff `S22`** (the phone frame's trailing note, the tablet
panel's row rhythm, and the «Contenido» note); **Client `07`** (the
«Contenido» note only). Send [30](./30-invariants-checklist.md) alongside
this follow-up; like [80](./80-mobile-card-surface.md) it names in the
README a pattern the frames already draw.

---

Found by MOB-040 on 2026-10-06, comparing `07` «Historial de clases» and
`S22` «Historial de la clienta» with the apps, which now draw the frames'
rows from one shared list:

1. Both phone frames list each attended class as a row directly on
   Superficie, not as a card: 16 px vertical padding, a 1 px `#EFE7DE` rule
   under every row but the last of its month, a 38 px day column (Lora 20
   weight-500 day, zero-padded, over a 10 px uppercase `0.1em` `#7A716D`
   weekday), then the Class Type in Lora 17 weight-500 over «Entrenadora ·
   Sucursal» in 13 px `#766D69`. Each month opens with an 11 px uppercase
   `0.16em` `#766D69` heading and a 12 px `#7A716D` count («6 clases») over
   a 1 px `#D8C9BB` rule, and the screen opens with «Has asistido a» /
   «Ha asistido a» in 13 px `#766D69` over «37 clases desde marzo» in Lora
   26 weight-500. The README does not describe this list, and its colour
   table has no `#EFE7DE`: the rule under the header bar and between these
   rows on 46 of the 48 Client and Staff frames, and the footer rule inside
   `S11`'s cards and `17`'s origin list. Its «Divisor» `#F2EBE2` is named
   for row separators inside cards, which `S06`'s history card does not use
   either.
2. The empty states of `07`, `19`, `S20`, `S21`, and `S22` centre a bare
   34 px line icon in `#C4BAB6` (stroke 1.1), a Lora 21 weight-500 title,
   and a 14 px `#766D69` note; the row chevrons of `02`, `18`, and `S23` are
   19 px in the same `#C4BAB6`. That tone is not in the closed palette
   either, so the README must name it before another screen reaches for a
   near miss.
3. `S22`'s phone frame ends its list with «Se cargan más meses al
   desplazar.», and the «Contenido» notes of `07` and `S22` promise «carga
   progresiva al desplazar». The history endpoint returns the whole record
   at once and `07` draws no such note, so the two frames disagree with each
   other and with the product.
4. `S22`'s tablet panel draws the same rows 2 px tighter than the phone
   frames: 14 px row padding, a Lora 19 day, a 4 px group gap, a 9 px
   heading padding, 24 px between groups, and a Lora 24 summary. The apps
   draw one row on every device, as they draw one card radius since
   follow-up 80.

## 1. README — the colour table

Add two rows after «Divisor»:

- Regla `#EFE7DE` — «The rule under a Client or Staff header bar, between
  list rows drawn on Superficie, and under a card's footer line».
- Icono tenue `#C4BAB6` — «Quiet line icons: the 34px empty-state glyphs
  and the 19px row chevrons on Client and Staff screens».

## 2. README — a «Lists between rules (Client and Staff)» section

After «Cards (Client and Staff)», add:

- A read-only list drawn directly on Superficie (`07`, `S22`) puts each item
  in a row with 16px vertical padding and a 1px `#EFE7DE` rule under every
  row but the last of its group; no card, no shadow, no chevron.
- The history row: a 38px day column (Lora 20 weight-500 day of the month,
  zero-padded, over the 10px uppercase `0.1em` `#7A716D` weekday), then the
  Class Type in Lora 17 weight-500 over «Entrenadora · Sucursal» in 13px
  `#766D69`, 16px apart.
- Groups: an 11px uppercase `0.16em` `#766D69` heading with a 12px `#7A716D`
  count on the right («6 clases»), over a 1px `#D8C9BB` rule, 6px above the
  first row; 30px between groups. The screen opens with «Has asistido a»
  (`07`) or «Ha asistido a» (`S22`) in 13px `#766D69` over «N clases desde
  <mes>» in Lora 26 weight-500. The whole record is listed at once; nothing
  loads on scroll.
- An empty list on the screen (`07`, `19`, `S20`, `S21`, `S22`) centres a
  34px `#C4BAB6` line icon (stroke 1.1), a Lora 21 weight-500 title, and,
  when the prompt asks for one, a 14px `#766D69` note up to 260px wide, with
  no box behind them.

## 3. `S22` — the trailing note and the tablet rows

- Remove the «Se cargan más meses al desplazar.» line under the phone
  frame's last group.
- In the tablet panel, change the rows to the phone values: row padding
  `14px 0` → `16px 0`; the day `font-size:19px` → `20px`; the group gap
  `4px` → `6px`; the heading `padding-bottom:9px` → `10px`; the gap between
  groups `24px` → `30px`; the summary `font-size:24px` → `26px`. The panel's
  Lora 28 title and its paddings stay.
- In the «Contenido» note, replace «, en orden descendente, agrupadas por mes
  y con carga progresiva al desplazar.» with «, en orden descendente y
  agrupadas por mes.».

## 4. `07` — the «Contenido» note

Replace «Orden descendente, agrupado por mes, con carga progresiva al
desplazar.» with «Orden descendente, agrupado por mes.».

## Preserve everything else

Every other property of the rows, headings, summaries, and empty states of
`07` and `S22`, both frames' header bars and `S22`'s banner, every other
screen, and every other README line.
