# Follow-up — «Cada semana» with several days and times

Targets: **AW03 Formulario de Sesión** (the «Escritorio · Nueva sesión ·
Cada semana» frame, and one new frame right after it, «Escritorio · Nueva
sesión · Cada semana · día repetido»); **generated handoff
`design/README.md`** (the `AW03` inventory row). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by WEB-025 on 2026-10-16. Using the production admin web, the user
wanted a class that runs on several days, such as Lunes 07:00, Miércoles
07:00 and Viernes 18:30, set up in one go. Today «Cada semana» takes one
«Día de la semana» and one «Hora», so the Administrator repeats the whole
form for each day. The user approved the proposal on 2026-10-16. Saving
creates one weekly Session Schedule per row (ADR-0059, Bolivia weekday and
wall clock per ADR-0057), all together or none. Every row lasts the Class
Type's duration. Each row stays its own schedule afterwards: editing or
ending one changes only that row, so no edit frame changes.

## 1. AW03 «Escritorio · Nueva sesión · Cada semana»

Replace the «Día de la semana» + «Hora» pair with a **«Días y horas»**
group, in the same place (between «Entrenadora» and «Capacidad»):

- The label «Días y horas» in the field label style (10.5 px uppercase,
  `0.14em`, `#766D69`).
- One row per day, 8 px apart. Each row is a grid of `minmax(0,1fr) 104px
  52px 30px` with an 8 px gap:
  - the «Día» select (44 px, the existing select style, no label of its
    own; screen readers hear «Día, fila 1»);
  - the «Hora» input (44 px, the existing input style; «Hora, fila 1»);
  - the duration as read-only text, «50 min», 12.5 px tabular `#7A716D`,
    centred vertically (the Class Type's duration; «— min» before a Class
    Type is chosen);
  - a 30 px square remove button (1 px `#E4D8CC`, radius 8, `#FAF7F2`,
    hover border `#B78380`, a 13 px stroke ×, `aria-label` «Quitar lunes
    07:00»). With a single row the button is not drawn and its cell stays
    empty.
- Under the rows, a text button «+ Agregar día» (13 px weight 500 Palo de
  rosa `#B78380`, hover `#9C6764`, 14 px plus icon). It adds a row for the
  day after the last row's day, at the last row's time. With seven rows it
  is not drawn.
- Under that, the helper «Cada día usa la duración del tipo de clase.»
  (11.5 px `#7A716D`).

Draw three rows: **Lunes 07:00**, **Miércoles 07:00**, **Viernes 18:30**,
each «50 min», with their remove buttons. Everything else in the frame stays
as drawn: «Cada semana» chosen and its helper line, Reformer Intermedio,
Camila Rojas, Capacidad 10, «Vigente desde» 18/08/2026 with «Fecha en hora
de Bolivia.», and «Guardar» at rest. Make the panel taller so nothing is
cut. Change the caption line to «Varios días, cada uno con su hora ·
duración del tipo de clase · genera 30 días hacia adelante».

## 2. AW03 «Escritorio · Nueva sesión · Cada semana · día repetido» (new)

The same frame, with the second row also set to **Lunes 07:00**. That row's
select and input have the Error `#B25D4B` border, and under the row sits the
11.5 px Error line «Ya está el lunes a las 07:00.». A row whose time
overlaps another row of the same day, given the duration, reads «Se cruza
con el lunes a las 07:00.» the same way (no frame). «Guardar» refuses to
send while a row is repeated or overlapping. Caption «Escritorio · Nueva
sesión · Cada semana · día repetido» with the line «Un día y una hora
repetidos se marcan en su fila; no se guarda nada».

## 3. After «Guardar»

Nothing new is drawn: the panel closes, and AW02's Éxito line counts every
row together, «3 series semanales creadas: 12 sesiones en los próximos 30
días.», followed by the existing «N se omitieron porque se cruzaban con
otras sesiones.» when that applies. With one row it keeps today's «Serie
semanal creada: …». If the backend refuses a Trainer or Class Type, nothing
is saved and the existing field errors show.

## 4. README

In the `AW03` inventory row, replace «or «Cada semana» (Día de la semana +
«Vigente desde» in Bolivia time, Sessions generated 30 days ahead)» with «or
«Cada semana» (one or more «Días y horas» rows, each a weekday and time with
the Class Type's duration shown, «+ Agregar día» up to seven and a remove
button per row, repeated or overlapping rows marked on the row; one shared
«Vigente desde» in Bolivia time; every row saved together or none, each its
own weekly schedule afterwards; Sessions generated 30 days ahead)».

## What must remain untouched

Every other AW03 frame: «Escritorio · Nueva sesión», «Nueva sesión desde un
espacio libre», «Editar sesión», «Esta y las futuras» (still one Día and one
Hora: a series edits one row), «Cancelar sesión», «Terminar la serie», and
the 420 px sheet. Also AW02, the shell, and every other screen and README
section.
