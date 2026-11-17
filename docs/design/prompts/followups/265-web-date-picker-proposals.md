# Follow-up — Walkthrough finding 83: a calendar for the admin web's dates (proposals)

Targets: the admin web's shared date field, drawn on **P04 Promociones ›
Nueva promoción** (the drawer) and on one single-date field (**Gasto ›
Fecha**), as proposals only, on a canvas of their own exported to
`design/v2/propuestas-fecha-web/`. Read with
[225](./225-visual-system-v2.md) and [257](./257-freeze-calendar-proposals.md)
(the client app's month `Calendar`). Send
[30](./30-invariants-checklist.md) alongside this follow-up. No exported
screen is regenerated here: follow-up 266 records what the owner chose.

---

Written on 2026-11-15 for DES-018 (walkthrough finding 83).

## Why

Every date in the admin web is a text field the Administrator types as
«dd/mm/aaaa». Clicking it opens nothing. The owner met it in Promociones ›
Carrusel › Nueva promoción («Fecha de inicio» / «Fecha de fin»): «al hacer
click no se abre un calendario debemos mejorar ese diseño!!». The field is
one shared component, used in about twelve places: Horario (new class,
series, one class, «Vigente hasta», pausing and ending a series),
Promociones, Gastos, Pago de sueldo and its period, Reglas del estudio,
Informes and the courtesy access. Fixing it once fixes every screen.

## What every option keeps

- **Typing still works.** The field keeps «dd/mm/aaaa» with the same mask;
  a typed real date moves the calendar to its month and marks it, and a
  picked day writes the text.
- **The look of the client app's `Calendar`** (FIX-053): Monday first,
  «‹ mes año ›» with Lora for the month, weekday initials, a filled Rosa
  circle for a picked day, a Rosa tinte band between the two ends of a
  range, a ring on today, and days that cannot be picked muted and struck
  through. Today is Sunday 15 November 2026 (Bolivia).
- **Limits.** A field may have a first or last allowed day: a Gasto, a
  payment and a report end no later than today; «Fecha de fin» can't be
  before «Fecha de inicio». Days outside are muted; clicking one says why
  under the grid, in the field's own words («La fecha no puede ser
  posterior a hoy.», «La fecha de fin no puede ser anterior a la de
  inicio.»).
- **Invalid text** («31/02/2026») stays on screen with «Elige una fecha
  válida.» in Error under the field; the calendar opens on today's month
  with nothing marked.
- **Keyboard**: the arrows move the focused day, Enter picks it, Esc
  closes without changing anything, Tab leaves. Each day is a button named
  «domingo, 15 de noviembre de 2026, hoy».
- **Inside the drawer.** The calendar never leaves the drawer or covers
  its footer; at 420 px the drawer is the whole width and so is the
  calendar.

## The canvas

`Main.dc.html` (1440 wide) states the three options (A recommended) and
the states. Each option has a clickable board at 1440 (the Promociones
page with the drawer open) and a 420 board. A dark strip at the top of
each board is the prototype's control and not part of the design; its
chips switch the case: «Rango · Promoción», «Una fecha · Gasto (hasta
hoy)», «Texto inválido» and «Fin antes del inicio».

1. **A · Calendario bajo el campo** (recommended). Each field gets a
   calendar icon at its right; clicking the field or the icon opens a
   small floating calendar right under it (above it when there is no room
   below), one month, with «Hoy» and «Borrar» at its foot. Picking a day
   writes it and closes. In a range, «Fecha de fin» opens on the start's
   month with the band drawn from the start.
2. **B · Un calendario para el rango**. «Fecha de inicio» and «Fecha de
   fin» become one field «Fechas» that reads «1 nov – 30 nov 2026 · 30
   días». It opens one calendar the drawer's full width, with two small
   typed fields «Desde» and «Hasta» on top and the hint «Haz clic en el
   primer día» / «Ahora haz clic en el último día»: the first click is
   the start, the second the end. Quick chips «Esta semana», «Este mes»,
   «30 días»; «Borrar» and **Listo** at its foot. Two months side by side
   do not fit the 480 px drawer, so it shows one at a time. A single date
   opens the small calendar of A.
3. **C · Calendario dentro del cajón**. Clicking the field unfolds the
   month calendar inside the drawer, under the date fields, pushing the
   rest down; nothing floats. One calendar open at a time, titled
   «Eligiendo: fecha de inicio»; picking a day or **Listo** folds it.
   Made for the drawer and for narrow screens.

A picked day is a filled Rosa profundo circle (`#93615D`) with white
text, not the app's Rosa (`#B78380`), because white on Rosa fails the
4.5:1 contrast on the web's 14 px numbers.

## Keep

The drawer's other fields, copy and buttons as P04 draws them; the
Promociones page behind it; the brand, colours and type of 225.
