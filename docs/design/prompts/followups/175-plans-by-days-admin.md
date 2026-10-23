# Follow-up — Plans by days on the admin catalogue

Targets: `AW04` (Planes) and `AW05` (Formulario de plan), and the generated
handoff `design/README.md` (the `AW04`/`AW05` rows). Send
[30](./30-invariants-checklist.md) alongside.

---

Written by BKM-005 on 2026-10-23. The owner's rules
([decisions](../../../decisiones-emma-pilates.md) 2.1–2.3) and
[booking ADR-0005](../../../../booking/docs/adr/0005-validity-in-days-with-a-chosen-start-date.md)
and [ADR-0006](../../../../booking/docs/adr/0006-weekly-cap-and-extra-classes.md)
replace calendar months: a Plan is valid for **30, 60, or 90 days**, and the
60- and 90-day Plans may carry a **Weekly Cap** of 3 or 4 classes a week.

## Amends checklist 30, section 1

From here on, read the plan catalogue as the eight Plans of the decisions'
table 2.1, in this order, wherever a screen draws the catalogue or sample
plan names:

| Plan | Clases | Vigencia | Precio | Tope semanal |
| --- | --- | --- | --- | --- |
| Clase suelta | 1 | 30 días | Bs 80 | — |
| 4 clases | 4 | 30 días | Bs 290 | — |
| 8 clases | 8 | 30 días | Bs 590 | — |
| 12 clases | 12 | 30 días | Bs 820 | — |
| Bimestral 16 clases | 16 | 60 días | Bs 1.120 | 3 por semana |
| Bimestral 24 clases | 24 | 60 días | Bs 1.560 | 4 por semana |
| Trimestral 24 clases | 24 | 90 días | Bs 1.590 | 3 por semana |
| Trimestral 36 clases | 36 | 90 días | Bs 2.190 | 4 por semana |

The six-plan list of section 1 (Paquete de 8 clases … Anual 180 clases) is
retired. Screens this follow-up and 176–178 do not target keep their sample
names until they are next exported; that is not a regression. A Plan's
validity is never written in months («1 mes», «3 meses», «Mensual» as a
duration): always «30 días», «60 días», «90 días».

## `AW04` Planes

- The «Duración» column becomes **«Vigencia»**, showing «30 días», «60 días»,
  or «90 días».
- A new column **«Tope semanal»** right after it: «3 por semana», «4 por
  semana», or «Sin tope» in the tenue text colour.
- The table rows are the eight Plans above, all «Visible»; add one hidden
  row at the end, «Paquete de 12 clases · 30 días · Sin tope · 12 clases ·
  Bs 780,00 · Oculto», standing for the monthly Plans BKM-005 hid.
- The explanatory note «Una fila, un plan» names «Nombre, vigencia, tope
  semanal, clases incluidas y precio».

## `AW05` Formulario de plan

- The «Duración» select becomes **«Vigencia»** with three options «30 días»,
  «60 días», «90 días» (the closed-duration note says «Solo 30, 60 o 90
  días: tres opciones, sin campo libre»).
- A new select **«Tope semanal»** right below it, with «Sin tope», «3 clases
  por semana», «4 clases por semana», and the helper «Solo en planes de 60 y
  90 días. Las clases extra no cuentan.» When «Vigencia» is «30 días» the
  select is disabled and shows «Sin tope».
- The edit frame («Editar plan») is preloaded with «Bimestral 16 clases ·
  60 días · 3 clases por semana · 16 · Bs 1.120,00».
- The side list of sample plans uses the eight Plans with «30 días» / «60
  días» / «90 días».

## Leave untouched

Every other column, the visibility pill and «Ocultar en la app», the price
note, the panel layout and widths, the sidebar, and every other screen.
