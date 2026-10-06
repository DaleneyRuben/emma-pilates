# Follow-up — `S04`'s result rows on the tablet: one trimmed contact line

Targets: **Staff `S04`** (a new «Tablet · Resultados» frame after «Tablet ·
Dos paneles», and the contact line of every result row); **generated handoff
`design/README.md`** (a new «Search result rows (`S04`)» section after
«Branch picker pill (`03`, `S07`, `S13`)»). Send
[30](./30-invariants-checklist.md) alongside this follow-up; like
[83](./83-shortcut-tiles-and-picker-pill.md) it draws a state the app has
and names its rule in the README.

---

Found by MOB-042 on 2026-10-06 while verifying the Assistant's split view on
the iPad Pro 11, and measured by MOB-046 with a script over `S04`:

1. The tablet frame «Tablet · Dos paneles» draws the left panel 392px wide
   (`grid-template-columns:392px 1fr`, padding `36px 24px`, so 344px of
   rows) and fills it with the «Clientes recientes» initial state: four
   rows of a 40px avatar, a name, and **one** contact each (a phone or an
   email), no chevron and no shadow. No tablet frame shows a search result,
   and the phone's result row (`{{ c.contact }}`: «phone · email» in 13px
   `#766D69`, after a 42px avatar and before the 19px chevron) has no
   overflow rule, so a contact longer than the row wraps under the name.
   In the app the split view's column gives the row the same 344pt, and
   «+591 70011001 · lucia@example.com» wrapped to two lines there.
2. The app keeps «phone · email» on one line and trims it with an ellipsis
   (MOB-046), on the phone and in the split view alike; the design should
   show that state and the README should say so.

## 1. `S04` — the contact line of every result row

In the result row template of the «Teléfono · Resultados» frame (the
`<sc-for list="{{ results }}">` button), change the contact span to
`font-size:13px;color:#766D69;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`.
Its parent column already has `min-width:0;flex:1`, so the ellipsis can
act. Apply the same four properties to the contact span of every result
row drawn statically on `S04`.

## 2. `S04` — a «Tablet · Resultados» frame

Add a frame after «Tablet · Dos paneles», with the caption «Tablet ·
Resultados» and the subcaption «La misma fila de resultados que el
teléfono, en la columna de 392 px; el contacto se recorta en una línea».
Copy the «Dos paneles» frame and change only the left panel:

- The search field holds the typed text «luc» in 15px `#4A4A4A` instead of
  the placeholder.
- The «Clientes recientes» block becomes the phone's results block: the
  eyebrow «Resultados» with «2» in 12px `#7A716D` on its right, then two
  rows drawn exactly like the phone's result row (gap 14, padding
  `16px 18px`, 1px `#D8C9BB`, radius 16, Blanco, the 0.05 shadow, a 42px
  avatar on `rgba(216,189,184,0.4)` with the first letter in Lora 16 and
  `#8A5D59`, the name in 16px `#4A4A4A` over the contact of §1, and the
  19px `#B78380` chevron):
  - «L» · «Lucía Justiniano» · «+591 700 12345 · lucia.justiniano@correo.com»
    (long enough to be trimmed at 344px);
  - «L» · «Lucero Vargas» · «+591 712 88990 · lucero@correo.com».
- The right panel stays the «Selecciona un cliente para ver sus detalles»
  state.

The frame keeps the device's 1104px width and 768px height.

## 3. README — a «Search result rows (`S04`)» section

After «Branch picker pill (`03`, `S07`, `S13`)», add:

> ### Search result rows (`S04`)
>
> - A result row (padding 16px 18px, gap 14) is a 42px circle on
>   `rgba(216,189,184,0.4)` with the Client's first letter in Lora 16
>   `#8A5D59`, the name in 16px `#4A4A4A` over «phone · email» in 13px
>   `#766D69`, a «Pendiente» tag while the account is pending, and the 19px
>   `#B78380` chevron. The contact stays on one line and is trimmed with an
>   ellipsis when the row is narrower than it.
> - On the tablet the rows sit in the fixed 392px left panel (24px padding,
>   344px of rows) beside the detail panel; the phone draws them at the
>   screen's width.

## What must remain untouched

The «Teléfono · Resultados» and «Teléfono · Sin resultados» frames beyond
the contact span; the «Tablet · Dos paneles» frame and its «Clientes
recientes» rows; the right panel; every other `S04` note.
