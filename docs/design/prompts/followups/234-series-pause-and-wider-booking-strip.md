# Follow-up — Pausing a weekly series, and booking strips past seven days

Targets: **P02 Horario** (admin web v2, a new board `P02b-Horario-serie`),
**C03 Reservar** (Client app v2, a new board `C03d-Reservar-otra-fecha`) and
**S07 Reservar una clase** (Staff app v2, a new board
`S07b-Reservar-otra-fecha`). Read with [225](./225-visual-system-v2.md) and
[233](./233-admin-web-pages-on-v2.md). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written on 2026-11-04 for BKM-018 and FIX-031. 233 drew «Pausar la serie»
and «Terminar la serie» as buttons in the class panel and «Vigente hasta
(opcional)» in «Nueva clase», but not what pausing asks for, nor how a
paused series reads. FIX-026 made the booking window a Studio Rule of 1 to
30 days; C03 and S07 draw seven day chips sharing the width, so days 8 to
30 of a wider window cannot be reached. S13 already solves the same problem
with six days and «Otra» (the Administrator's «Cancelar una clase», 30
days).

## 1. P02b Horario · pausing a series

A copy of P02 with the class panel open on a class of a weekly series
(Reformer Pilates, Miércoles 07:00, Emma Vargas). A board tweak «vista»
switches between «pausar» and «pausada»; «nueva» keeps 233's form.

**«Pausar la serie»** replaces the class detail inside the panel, as
«Cancelar esta clase» does, with the back arrow and the title «Pausar la
serie». Under the title, the series card: `event_repeat` disc, «Reformer
Pilates · cada miércoles 07:00», note «Emma Vargas · Sucursal Centro». Two date
fields side by side: «Pausar desde» (Miércoles 23 de diciembre) and «Vuelve el
(opcional)» with the placeholder «Hasta que la reanudes» in the tenue text.
An info notice (`info`, Rosa claro): «En esas fechas no se publican clases
de la serie. Las que ya tienen reservas se mantienen; cancélalas una por
una si hace falta.» Actions: «Volver» (text) and «Pausar la serie»
(primary). The toast after: «Serie en pausa · vuelve el miércoles 6 de enero»,
or «Serie en pausa hasta que la reanudes» without a return date.

**A paused series.** Opening a class of a series with a pause: the panel's
«Serie semanal» pill reads «Serie en pausa» (amber status pill), and an
amber notice above the actions: `pause_circle`, «En pausa del 23 de
diciembre al 5 de enero.» (or «En pausa desde el 23 de diciembre, hasta que
la reanudes.»). The «Pausar la serie» button becomes «Reanudar la serie»
(secondary), which acts at once with the toast «Serie reanudada · sus
clases vuelven a la app».

**«Nueva clase» · Cada semana** keeps 233 as drawn: «Vigente hasta
(opcional)», «Sin fecha de fin» and the `all_inclusive` note «Sin fecha de
fin, la serie sigue cada semana hasta que la pauses o la termines.»

## 2. C03d and S07b · a booking window above seven days

Copies of C03 and S07 for a window of 14 days. The strip keeps seven chips:
Hoy and the next five days, then «Otra» drawn as S13 draws it (same chip,
same width). Tapping «Otra» opens S13's date sheet as the Staff app ships
it: the title «Elige otra fecha», the window's later days (dom 8 to dom 15
de noviembre) as day chips that wrap, the chosen one in Rosa, and «Cerrar».
After choosing, the «Otra» chip
shows the day's number and stays selected, as in S13. With a window of
seven days or fewer the strip stays as C03 and S07 draw it, without «Otra».

## Leave untouched

P02, C03, S07 and S13 as exported; the week board, the roster, «Reservar a
una clienta», «Cancelar esta clase», the filters, the session rows and the
tab bar. No new colours: amber only in the status pill and notice, one Rosa
profundo emphasis per page.
