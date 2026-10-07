# Follow-up — `04`'s «Lleno» pill and bar track inside the closed palette

Targets: **Client `04`** (the «Lleno» pill's background in the «Clase llena»
frame and the capacity bar's track in the three frames, nothing else);
**generated handoff `design/README.md`** (the «Seat pills» heading and rule
extended to `04`, plus one bullet for `04`'s capacity block). Send
[30](./30-invariants-checklist.md) alongside this follow-up; like
[84](./84-seat-pills-and-palette-text-tones.md) and
[87](./87-s08-capacity-box-on-blanco.md) it is a colour-only change that
settles two values outside the closed palette. Colours change; no size,
spacing, copy, or structure does.

---

Found by MOB-048 on 2026-10-06 and measured by MOB-049 on 2026-10-07 with a
script over the three frames of `design/04 Detalle de Sesión.dc.html`:

1. The capacity block is a bare `gap:10px` column under the details grid: a
   baseline row with the count («**5** de 12 cupos disponibles», 15px
   `#4A4A4A`, the number a Lora 18 weight-500 `<strong>`) and, on the right,
   «7 reservados» in 12px `#7A716D` or, in «Clase llena», a «Lleno» pill
   (`6px 12px`, radius 999, 12px weight 500, `#6E6663`); under it the 7px
   bar gated by the `capacityDisplay` prop («Barra» by default): a
   `#B78380` fill sized to the booked share, `#C4BAB6` at 100% when full.
2. The «Lleno» pill sits on `rgba(74,74,74,0.07)`, a Plomo cálido tint
   outside the palette. Follow-up 84 settled one seat-pill rule, where a
   full class is `rgba(216,201,187,0.34)` behind Texto secundario `#6E6663`,
   and `04`'s pill already matches it in text tone, size, weight, padding,
   and radius; only its background was left out because the rule names `03`,
   `06`, `S02`, `S07`, `S08`, and `S13` and not `04`.
3. The bar's track is `#EFE4DC`, which is not in the palette. The fill is
   Palo de rosa `#B78380`, and the README defines a tint as the semantic
   colour at low intensity: its Palo de rosa tinte is `#EFE0DC`, four units
   away in one channel. The neutral pill `rgba(216,201,187,0.34)` is a pill
   background, not a track, and would put a sand track under a rose fill,
   so the track takes the tint. The full fill `#C4BAB6` is Icono tenue and
   stays.

## 1. `04` — the «Lleno» pill

In the «Clase llena» frame, change the «Lleno» span's
`background:rgba(74,74,74,0.07)` to `background:rgba(216,201,187,0.34)`.
Its `color:#6E6663`, `padding:6px 12px`, `border-radius:999px`,
`font-size:12px`, and `font-weight:500` stay.

## 2. `04` — the bar's track

In the three frames, change the track `div`
(`height:7px;border-radius:999px;background:#EFE4DC;overflow:hidden;`) to
`background:#EFE0DC`. The fills (`#B78380` at 58% and 36%, `#C4BAB6` at
100%), the 7px height, and the `showBar` gate stay. The avatar
placeholder's stripes (`repeating-linear-gradient(135deg,#EFE4DC 0 6px,…)`)
are not a track and keep their value.

## 3. README — «Seat pills» extended to `04`

Rename the heading «Seat pills (`03`, `06`, `S02`, `S07`, `S08`, `S13`)» to
«Seat pills (`03`, `04`, `06`, `S02`, `S07`, `S08`, `S13`)», and after the
`S08` bullet add:

> - `04`'s capacity block («**N** de M cupos disponibles» with the number
>   in Lora 18 weight 500, then «N reservados» in 12px `#7A716D` or the
>   «Lleno» pill on the right, and the 7px bar under the row) draws no card.
>   The bar's track is Palo de rosa tinte `#EFE0DC` under a Palo de rosa
>   `#B78380` fill sized to the booked share; when full the fill is Icono
>   tenue `#C4BAB6`, the count reads «0 de M», and the pill alone names
>   the state.

## What must remain untouched

Every other frame, size, padding, copy, caption, and the script of `04`
(the `capacityDisplay` prop keeps its «Barra» default); the count, the
«N reservados» line, the bar's height and fills; `S08`, which keeps its
box; and every other README section.
