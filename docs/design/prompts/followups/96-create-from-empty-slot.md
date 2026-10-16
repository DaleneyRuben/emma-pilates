# Follow-up — a new Session from an empty slot of the week

Targets: **AW02 Horario** (the «Escritorio · 1440 px» frame: one empty
slot drawn in its hover and keyboard-focus state, and its caption);
**AW03 Formulario de Sesión** (one new desktop frame, «Escritorio · Nueva
sesión desde un espacio libre»); **generated handoff `design/README.md`**
(the `AW02` and `AW03` inventory rows and one interactions bullet). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by WEB-024 on 2026-10-15. Using the production admin web, the user
wanted to add a class by clicking the empty space where it belongs on
Horario. Today only «+ Nueva sesión» opens the AW03 create panel, with
every field empty, so the Administrator reads the day and hour off the grid
and types them again. Times stay in Bolivia time (ADR-0057); nothing about
Sessions or weekly schedules changes (ADR-0059): the slot only fills in
fields the Administrator could have typed.

## 1. AW02 — the empty slot (desktop)

Each hour of each day column that no Session fully covers is an **empty
slot**: a target the full width of the column and one hour tall, sitting
behind the Session blocks (a block keeps its own click and keeps opening
AW03 in edit mode).

- **At rest** a slot draws nothing: the grid looks exactly as it does now.
- **On hover and on keyboard focus** it shows, inset like a block (5 px
  each side, 1 px from the hour lines, radius 7): the Hover de fila
  `#FDF7F2` fill, a 1 px dashed Palo de rosa `#B78380` border, and at its
  top left a 14 px plus icon and the hour, «10:00», 11 px weight 500
  `#8A5D59`. Keyboard focus adds the design system's focus ring (2 px
  Blanco, then 2 px `rgba(74,74,74,0.55)`), as «Guardar» draws it in AW03.
- Slots are reachable with Tab in the order of the day, between the Session
  blocks of that day; Enter or Space opens the panel. Screen readers hear
  «Nueva sesión el jueves 13 de agosto a las 10:00».
- Slots on past days look and behave the same: the panel then refuses the
  date with its existing «Elige una fecha desde hoy.» line on «Guardar».

Draw one slot in this state in the «Escritorio · 1440 px» frame: **Jue 13
at 10:00** (the free hour between the 08:00 and 13:00 blocks), with the
focus ring. Change that frame's caption line to «Barra lateral siempre
visible · rejilla de 7 días · un espacio libre con foco abre «Nueva
sesión»».

The narrow frames are unchanged: the 420 px day list has no time axis, so
«+ Nueva sesión» stays the only way to create there.

## 2. AW03 — «Escritorio · Nueva sesión desde un espacio libre»

A new panel-only frame in the row of smaller frames, right after
«Escritorio · Nueva sesión · Cada semana», drawn like that frame (the
560 px dimmed card with the 408 px panel, 780 px tall):

- Title «Nueva sesión», context line «Sucursal Equipetrol · sala única»
  (the Branch selected in the top bar).
- «Una sola vez» chosen; «Tipo de clase» and «Entrenadora» showing their
  placeholders («Elige un tipo de clase», «Elige una entrenadora»); «Fecha»
  **13/08/2026** and «Hora» **10:00** filled in; «Capacidad» with its
  «Según el tipo de clase» placeholder and its helper line; «Guardar» at
  rest.
- Caption «Escritorio · Nueva sesión desde un espacio libre» with the line
  «Clic en un espacio libre de AW02 · fecha, hora y sucursal ya puestas ·
  todo se puede cambiar».

Everything else is the create mode as drawn: every field stays editable,
and switching to «Cada semana» shows «Día de la semana» set to that day
(Jueves) and «Vigente desde» set to that date.

## 3. README

- In the `AW02` inventory row, after «establishes the shell;», add «an
  empty hour of a day column opens `AW03` in create mode (hover and focus:
  Hover de fila fill, dashed Palo de rosa border, «+ HH:00»);».
- In the `AW03` inventory row, after «Side panel;», add «opened from an
  empty `AW02` slot it starts with that date and hour (and, under «Cada
  semana», that weekday and date) filled in;».
- In «Navigation — admin web», after the first bullet, add: «`AW02→AW03` from an empty slot of the
  desktop week grid (create mode with Fecha and Hora prefilled in Bolivia
  time, the top bar's Branch); the 420 px day list keeps only «+ Nueva
  sesión».»

## What must remain untouched

Every Session block, the week stepper, the legend, the Éxito line, and the
narrow frames of AW02; every existing AW03 frame (including «Escritorio ·
Nueva sesión» with its empty form); the shell; every other screen and
README section.
