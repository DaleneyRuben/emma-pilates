# Follow-up — Horario on proposal A, cancelled classes on the boards, and the rail without the «E»

Targets: **P02 Horario** and **P02b Horario · serie en pausa** (admin web
v2), the rail of **P01** and **P03–P09**, **S02 Mi agenda** and a new
**S02b Mi agenda · clases canceladas** (Staff app v2). Read with
[233](./233-admin-web-pages-on-v2.md), [234](./234-series-pause-and-wider-booking-strip.md),
[243](./243-horario-edit-panel-and-cancelled-classes.md) and
[244](./244-horario-proposals-corrections.md). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written on 2026-11-05 for DES-009. The owner chose **A · Lista y acciones
abajo** for the class panel and accepted «Serie en pausa» as a third
cause and hiding classes withdrawn by a changed or ended series
(decisiones §20.24). This follow-up moves 243 and 244 from the proposals
canvas onto the real boards.

## 1. The rail (P01, P02, P02b, P03–P09)

Remove the «E» monogram above the first destination. The rail starts at
**Inicio**; nothing replaces it. Everything else in the rail and the top
bar stays.

## 2. P02 and P02b · the week

P02's week (2 – 8 de noviembre, today Tuesday 3) gains its cancelled
classes in place, drawn as 243 §2 and 244 §4 say (Marfil block, 1 px
dashed `#D8C9BB` border, class name weight 500, the cause pill with
wrapping text, no seat count):

- Monday 2, 12:00 Mat Pilates (Emma Vargas): «Cancelada · mínimo no
  alcanzado»;
- Tuesday 3, 07:00 Mat Pilates (Emma Vargas): «Cancelada · mínimo no
  alcanzado»;
- Wednesday 4, 12:00 Mat Pilates (Daniela Ortiz): «Cancelada por el
  estudio»;
- Saturday 7, 10:00 Reformer Pilates (Daniela Ortiz): «Serie en pausa»
  (amber pill). Saturday no longer shows «Agregar».

Past days lose 233's `opacity .55`: their header and block text turn Tenue
`#6F6662`, class names weight 500 (244 §4). The subtitle counts «10
clases esta semana · 3 canceladas · 1 en pausa». The note under the week
reads «Los días pasados se ven en gris y solo se pueden leer. Las clases
canceladas quedan en su lugar, apagadas, con el motivo. Toca una clase
para ver quiénes reservaron.» P02b's week is the same.

## 3. P02 and P02b · the class panel on A

The panel's «detalle» view becomes 243 §4 A, drawn from the selected
class:

- header: class name, «Martes 3 de noviembre · 09:00 – 09:50 · Centro»,
  pills «Serie semanal» (or 234's amber «Serie en pausa»), «14 de 14
  reservadas» (neutral) and «Llena» when full;
- a past class keeps «Clase pasada: solo lectura.» and shows only the
  bookings, with no «Quitar», no button and no fields;
- «Reservaron (n)» with the small **«+ Reservar»** (on a full class
  «+ Lista de espera») to its right; the bookings and, when there is one,
  «Lista de espera (n)» as plain lists on Marfil with hairlines;
- a hairline, then **«Aplicar cambios a»** over the segmented control
  «Solo esta sesión | Esta y las futuras», which switches the fields:
  Entrenadora, Fecha + Hora, Capacidad; or Día de la semana + Hora,
  Entrenadora, Capacidad + Vigente desde, with «Guardar la serie»;
- footer: «Cancelar esta clase» (danger text) at the left, «Guardar» at
  the right;
- the quiet «Serie semanal · cada martes 09:00» row with «Pausar la
  serie» (or «Reanudar la serie» on P02b while paused) and «Terminar la
  serie».

The old button stack («Reservar a una clienta», «Editar», «Pausar la
serie», «Terminar la serie», «Cancelar esta clase») is gone. 234's pause
form and toasts, the booking search view, «Nueva clase» and the cancel
confirmation stay.

A new panel view **«cancelada»** (a `vista` tweak value on both boards)
opens when a cancelled block is clicked: the class name, its date and
time, the cause pill, the info notice (`event_busy`) «Se canceló sola el
martes 3 a las 04:00: no llegó al mínimo de 2 reservas. Las clientas que
reservaron recuperaron su clase.» (for «por el estudio»: «La canceló el
estudio. Las clientas que reservaron recuperaron su clase y les llegó un
aviso.»; for a paused series: «Esta clase no se publica: su serie está en
pausa.»), the Entrenadora and Lugares rows («1 de 14 al cancelarse»; «0 de
12» for the paused one) and «Cerrar».

## 4. S02 and S02b · the Trainer's agenda

- **S02** (Monday 2, Achumani) gains a fourth card at 12:00, Mat Pilates,
  «Cancelada por el estudio», drawn as 243 §3 and 244 say: Marfil, dashed
  `#D8C9BB` border, time in Lora Tenue over «60 min», the name, and the
  pill under it, no chevron, not a link. The header reads «Hoy · 3 clases
  · 1 cancelada».
- **S02b Mi agenda · clases canceladas** (new board, beside S02's row):
  the same day with every class cancelled by the 3-hour check: 07:00
  Reformer Intermedio, 09:30 Mat Pilates, 12:00 Mat Pilates and 18:00
  Reformer Principiante, each «Cancelada · mínimo no alcanzado»; the header
  «Hoy · 4 canceladas». «Hoy no tienes clases» (S02 · día sin clases) stays
  for a day with nothing at all.

## Leave untouched

Every other board; P02's Nutrición tab; P01d (it has no «E»); the
proposals in `design/v2/propuestas-horario/`, which stay as the record of
the choice.
