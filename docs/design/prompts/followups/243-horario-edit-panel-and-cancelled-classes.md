# Follow-up — Horario: a lighter «Editar sesión», cancelled classes in place, and the rail without the «E»

Targets: **P02 Horario** (admin web v2) and its class panel, the admin web
rail on every v2 board, and **S02 Mi agenda** (Staff app v2, Trainer), as
proposals on a canvas of their own (`design/v2/propuestas-horario/`). Read
with [225](./225-visual-system-v2.md), [232](./232-admin-web-structure-approved.md),
[233](./233-admin-web-pages-on-v2.md) and [234](./234-series-pause-and-wider-booking-strip.md).
Send [30](./30-invariants-checklist.md) alongside this follow-up. No exported
screen is regenerated: the owner picks one «Editar sesión» proposal, and a
later follow-up redraws P02, P02b and S02 with it.

---

Written on 2026-11-05 for DES-009 (second walkthrough, 2026-11-04, Paso 5
n.º 15, 16 and 17).

## Why

- **«Editar sesión» se ve muy abultada (n.º 17).** The class panel the
  admin web ships (`apps/admin-web/src/schedule/session-detail.tsx`) stacks
  four blocks of the same weight, one under the other: the «Reservaron (1)»
  card, a full-width **Reservar a una clienta** button, a full-width
  **Pausar la serie** button, and the **Solo esta sesión / Esta y las
  futuras** chips, whose legend does not read as a title. Then the fields
  (Entrenadora, Fecha, Hora, Capacidad) and, at the bottom, Guardar and
  **Cancelar esta clase**. **Pausar la serie** acts on the whole series but
  sits between the bookings and this class's edit, and it is wider than the
  panel's padding (a code bug, not drawn). The scope chips only change the
  fields under them, so they belong right above those fields.
- **The Horario hides cancelled classes (n.º 16).** The week grid and the
  Trainer's agenda only show classes still standing. In the walkthrough
  week, Monday to Thursday looked empty although they had classes that the
  3-hour check cancelled for want of the minimum; the Trainer's agenda said
  «Hoy no tienes clases» on a day her five classes were cancelled. **The
  owner decided (2026-11-05)**: show them in their place, muted, saying why.
- **The «E» on the rail (n.º 15).** 232 put a Lora «E» monogram above the
  rail's first destination. **The owner decided (2026-11-05)**: remove it.
  The rail starts at **Inicio**; the brand stays in the top bar's «Emma
  Pilates Studio».

## 1. The rail without the «E» (every web board here)

The rail keeps its 96 px width, its Lino `#F5EFE9` fill and its nine
destinations; the `.mark` «E» is gone and **Inicio** is the first item, at
the rail's top padding (20 px). Nothing moves up into its place and no
other mark replaces it. The top bar still reads «Emma Pilates Studio» in
full. At 420 px the drawer (P01d) has no «E» either.

## 2. Cancelled classes in the Horario (H boards, 1440 and 420)

A copy of P02's week (2 – 8 de noviembre, Sucursal Centro, today Thursday
5), filled the way the walkthrough found it: Monday to Thursday each carry
two classes that were cancelled (Wednesday's 18:00 by the studio, the rest
by the 3-hour check), Friday has three classes standing, Saturday one
standing and one of a paused series, Sunday nothing.

- **A cancelled class stays in its slot**, at its time, as a block with no
  fill: Marfil `#FAF7F2` with a 1 px dashed Arena `#E6DBD0` border, radius
  12. Time and trainer in Tenue `#6F6662`, the class name in Texto
  `#4A4A4A` weight 500 (not 600), no seat count, and a neutral pill
  (`rgba(216,201,187,.34)`, Tenue text) with the cause:
  - **«Cancelada · mínimo no alcanzado»** for the 3-hour check
    (`minimum_not_met`, and the older `zero_bookings`);
  - **«Cancelada por el estudio»** when the Administrator or the
    Coordinator cancelled it (`no_substitute_trainer`);
  - **«Serie en pausa»** for a class the series' pause withdrew
    (`schedule_paused`), with the amber status pill 234 uses;
  - a class withdrawn because its series was changed or ended
    (`schedule_changed`) is **not drawn**: the new series' class takes
    that place, and showing both would double the slot.
  No strike-through: it is hard to read on small type.
- **Past days keep 233's grey** (`opacity .55`) and stay read-only; a
  cancelled class on a past day gets both treatments.
- The subtitle counts all three: «Sucursal Centro · 4 clases esta semana ·
  8 canceladas · 1 en pausa». The note under the week reads «Los días
  pasados se ven en gris y solo se pueden leer. Las clases canceladas
  quedan en su lugar, apagadas, con el motivo.» The «Agregar» empty-slot tile shows only on a day with
  nothing at all, standing or cancelled.
- **Opening a cancelled class** opens the side panel read-only: the class
  name and «Jueves 5 de noviembre · 18:30 – 19:20 · Centro», the cause pill,
  the info notice (`event_busy`, Rosa claro left border) «Se canceló sola
  el jueves 5 a las 15:30: no llegó al mínimo de 2 reservas. Las clientas
  que reservaron recuperaron su clase.» (or «La canceló el estudio el
  miércoles 4 a las 10:12. Las clientas que reservaron recuperaron su clase
  y les llegó un aviso.»), and the Entrenadora / Lugares card («3 de 12 al
  cancelarse»). A class of a paused series reads «Esta clase no se publica:
  la serie está en pausa del 7 al 28 de noviembre. Vuelve sola el sábado 5
  de diciembre.» with the amber pill. No roster
  card, no booking, edit or cancel action; only «Cerrar».
- At 420 px the week is the day list P01d's pattern uses (one day under the
  other, the day header then its classes), with the same cancelled blocks.

## 3. S02 Mi agenda with cancelled classes (S boards, iPhone and Android)

S02 for Daniela Ortiz on Thursday 5 de noviembre, as the walkthrough found
it: her five classes that day were all cancelled by the 3-hour check.
One board on the iOS frame (390 × 844) and one on the Android frame
(412 × 915), each with a tweak «día» between **Hoy, todo cancelado** and
**Viernes 6, una cancelada** (three classes, the 18:30 one cancelled by the
studio).

- The section header counts both: «Hoy · 5 canceladas» or «Viernes 6 · 2
  clases · 1 cancelada». «Hoy no tienes clases» is shown only when the day
  has nothing at all.
- Today's five are 08:00, 09:30, 11:00 and 17:00 Mat Pilates and 18:30
  Reformer Pilates, all «Cancelada · mínimo no alcanzado».
- A cancelled class keeps its card in its place, muted and a little more
  compact (11 px vertical padding): Marfil fill with the 1 px dashed Arena
  border, time in Lora Tenue over «50 min», the class name in Texto weight
  500, and under the name the cause pill as on the web («Cancelada ·
  mínimo no alcanzado» / «Cancelada por el estudio»), in place of the
  branch line and the «Con cupos» pill. **No chevron and not tappable**:
  there is no attendance to take. The five cards fit above the tab bar.
- The day chips do not change.

## 4. «Editar sesión»: three proposals (A, B, C boards, 1440 and 420)

Each proposal is drawn on the H week with the panel open on **Reformer
Pilates, Viernes 6 de noviembre · 18:30 – 19:20**, a class of a weekly
series led by Daniela Ortiz, 1 of 12 booked (Lucía Fernández, «Paquete de
8 clases · le quedan 5»), no waitlist. A dark «Prototipo» strip on top of
each board (as 237's) has one chip per state; the panel's own buttons also
click through:

1. **Editar** (the default above);
2. **Esta y las futuras** selected (the fields become Día de la semana,
   Hora, Entrenadora, Capacidad, Vigente desde; Guardar reads «Guardar la
   serie»);
3. **Reservar a una clienta** (234's search view inside the panel, «Volver
   a la clase»);
4. **Pausar la serie** (234's pause form: «Pausar desde», «Vuelve el
   (opcional)», the info notice);
5. **Serie en pausa** (234's amber pill and notice, «Reanudar la serie» in
   place of «Pausar la serie»);
6. **¿Cancelar esta clase?** (the existing confirmation);
7. **Clase cancelada** (section 2's read-only panel).

The fields keep the shipped form: Entrenadora (select), Fecha and Hora side
by side, Capacidad; Guardar is the panel's only filled button.

### A · Lista y acciones abajo (recommended)

The owner's direction, refined.

- **Header**: «Reformer Pilates» (Lora 24), «Viernes 6 de noviembre ·
  18:30 – 19:20 · Centro», and one line of pills: «Serie semanal» (rose)
  and «1 de 12 reservadas» (neutral).
- **Reservaron (1)**: the h3 eyebrow with, on the same line at the right,
  a small secondary button **«+ Reservar»** (36 px, `person_add`); when the
  class is full it reads «+ Lista de espera». Under it, the bookings as a
  plain list on Marfil, no card: 36 px avatar, name, plan note, and «Quitar»
  as a danger text button; rows separated by Arena hairlines. The waitlist,
  when there is one, follows the same way.
- A 1 px Arena divider, then **«Aplicar cambios a»** (13 px weight 500
  label, like a field label) directly above the v2 segmented control
  «Solo esta sesión | Esta y las futuras», and the fields under it.
- **Footer**: «Guardar» (primary) at the right and «Cancelar esta clase»
  (danger text) at the left. Under the footer, a quiet **«Serie semanal ·
  cada viernes 18:30»** row: Tenue 13 px text with two small secondary
  buttons «Pausar la serie» and «Terminar la serie». Both stay inside the
  panel's 28 px padding.

### B · Dos pestañas

The panel splits into two tabs under the header (233's tab style):
**«Reservas (1)»** and **«Editar»**.

- **Reservas**: the plain list of A, with «Reservar a una clienta» as a
  secondary button under it (full width, the only button on the tab).
- **Editar**: «Aplicar cambios a» + the segmented control + the fields,
  Guardar and «Cancelar esta clase» in the footer, and the same quiet
  «Serie semanal» row with «Pausar la serie» and «Terminar la serie»
  under it.
- Opens on **Reservas** for a class with bookings, on **Editar** for an
  empty one.

### C · Menú de la serie

A's layout, with the series actions moved out of the panel body:

- the header gets a 40 px «Más acciones» button (`more_horiz`) beside the
  close button; it opens a small menu (240 px, Marfil, shadow as the top
  bar's account menu) with «Pausar la serie», «Terminar la serie» and,
  after a hairline, «Cancelar esta clase» in Error text;
- the footer keeps only «Guardar»;
- the bookings list and «+ Reservar» as in A.

## 5. The overview board (Main)

The canvas opens on a «Main» board, as 237's: the three findings in one
sentence each, one card per proposal (letter, name, «Recomendada» on A, a
small sketch, links to its 1440 and 420 boards), a link to the H and S
boards, and a comparison table with rows «Qué se ve primero», «Cuánto se
desplaza», «Dónde quedan las acciones de la serie», «Riesgo de tocar algo
sin querer» and «Trabajo». Recommendation under the table: **A**, because
it keeps everything on one view, puts each action next to what it acts on
(the booking button by the bookings, the scope by the fields, the series by
the series), and changes the least code. B hides the bookings while
editing; C hides the cancel action behind a menu.

## Leave untouched

P02, P02b, S02 and every other exported board (this canvas only proposes);
the rail's destinations, counts and widths; the top bar; the week's
navigation and «Nueva clase»; 234's pause form, toasts and copy; the
booking search view; the Nutrición tab. No new colours: the cancelled
blocks use Marfil, Arena and the neutral pill; amber only for «Serie en
pausa»; the brand is «Emma Pilates Studio», never «Emma» alone, and no
tagline.
