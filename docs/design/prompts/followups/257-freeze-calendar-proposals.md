# Follow-up — Verification finding 51: the freeze calendar and the request card (proposals)

Targets: **C12 Mi plan** (the freeze entry and the request's state) and a
new task screen **Congelar plan**, as proposals only, on a canvas of their
own exported to `design/v2/propuestas-congelar/`. Read with
[225](./225-visual-system-v2.md) and [256](./256-verification-findings-approved-options.md)
(the month under each day of a strip). Send
[30](./30-invariants-checklist.md) alongside this follow-up. No exported
screen is regenerated here: follow-up 258 records what the owner chose.

---

Written on 2026-11-08 for DES-015 (walkthrough Paso 11, verification
finding 51).

## Why

Carla's quarterly plan shows «Congelar plan» on Mi plan as two bare text
fields with the placeholder «AAAA-MM-DD», no labels, no date picker, no
word about the 15-day maximum and no new end date. The rest of the app
picks days from a strip. After sending, Mi plan adds one loose line, «Tu
solicitud de congelamiento está en revisión.», without the dates, the days
or the new end. The owner wants a calendar component that other screens
can reuse, in three clickable options.

The rules the calendar must enforce before sending (booking ADR-0010,
`freeze.ts`, `freeze-window.ts`):

- a 90-day plan only, once per plan (a refused request does not count, so
  she may ask again);
- the first day is today or later and inside the current term;
- at least 1 and at most 15 days; the last day is on or before the term's
  end;
- the plan's end moves by exactly the frozen days, and that new end must
  stay before a queued next plan (bought or in review). A next plan that
  starts the day after this one ends leaves no room: the freeze is off.
- Bookings inside the frozen days are cancelled on approval and their
  classes go back to the plan.

## The canvas

`Main.dc.html` (1440 wide) with the three options (A recommended), the
common Mi plan states, the refusal copy and a «Hoy» board. Every phone
board is 390 × 844 and clickable: tap days, change months, change the
number of days. A rose band at the top of each board is the prototype's
control strip and is not part of the design; its chips switch between «sin
plan siguiente» and «plan siguiente el 10 de febrero» (which caps the
freeze at 10 days).

Sample data: today Sunday 8 November 2026; Carla's «Trimestral 36 clases»
runs from 2 November 2026 to 30 January 2027.

All three open **Congelar plan** as a task screen (back arrow, no tab bar)
from a «Congelar plan» row on Mi plan («Hasta 15 días, una vez por plan»),
and share its bottom: a labelled «Motivo» field, the summary card (Del … al
… · N días · «Tu plan vencerá el …», «antes, el …»), the line «Si tienes
reservas esos días, se cancelan al aprobarse y las clases vuelven a tu
plan.», and **Enviar solicitud**, off until the dates and the reason are
set.

1. **A · Calendario del mes** (recommended). A month grid, Monday first,
   with ‹ › to move between the term's months. Tap the first day, then the
   last; the range is a Palo de rosa band with filled ends. Days before
   today, after the term's end or beyond the 15th day (or the next plan's
   cap) are muted; tapping one explains why under the grid. The grid is the
   reusable `Calendar` component.
2. **B · Tira y días**. The start strip already used for a plan's start
   (month under each day, 256), labelled «Empieza», then «Cuántos días» with
   − / + and quick chips 7 · 10 · 15, «hasta 15 días», and «Termina el …».
   Chips beyond the cap are off and say why.
3. **C · Campos y hoja**. Two labelled fields «Desde» and «Hasta» with a
   calendar icon; each opens a bottom sheet with the month grid of A for one
   date, with **Listo**. Under «Hasta», quick chips «1 semana · 10 días ·
   15 días».

Common Mi plan states (M-…), one card replacing the loose line: **En
revisión** (dates, days, «Tu plan vencería el …», «Te avisamos cuando la
administración responda.»), **Aprobado** (before it starts and while it
runs: «Congelado del … al …», «Ahora vence el …»), **No aprobado** (the
dates, «Puedes pedir otro congelamiento.», **Pedir otro**), and **Sin
lugar** (a next plan starting the day after: the row is off and says why).
Withdrawing a request is drawn as an optional text button on «En revisión»:
the API has no withdraw today, so it ships only if the owner wants it.

Refusals name what failed, before sending and if the server still refuses:
«El congelamiento no puede empezar antes de hoy.», «Puedes congelar hasta
15 días.», «Tu plan vence el 30 de enero: el congelamiento tiene que
terminar ese día o antes.», «Tu plan siguiente empieza el 10 de febrero:
puedes congelar hasta 10 días.», «Ya pediste un congelamiento para este
plan.», «Solo los planes de 90 días se pueden congelar.».

Untouched: the rest of C12, the v2 tokens, the staff and admin web freeze
review screens, the brand «Emma Pilates Studio» without tagline.
