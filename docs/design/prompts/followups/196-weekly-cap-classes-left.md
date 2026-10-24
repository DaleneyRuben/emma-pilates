# Follow-up — classes left this week

Targets: **03 (Reservar)** and **04 (Detalle de sesión)**. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by BKM-007 on 2026-10-23 from decisions §2.3 and booking ADR-0006.
A capped Plan limits how many classes a Client books from her base allowance
in a Monday–Sunday week. Reservar and the Session detail already list the
Session; they do not say how many classes of this week are left. The Client
app now draws the line the API returns in `classesLeftThisWeek`.

## `03` — under each Session card

On the phone and tablet frames that list Sessions, add one line of body text
directly under the card, only when the API field is a number:

«Te quedan 2 clases esta semana»

The same line with the number the field carries. One class reads «Te queda 1
clase esta semana». Zero reads «Te quedan 0 clases esta semana», including
when an extra class is still available: the extra-class line lives on Mi
plan, not here. When the field is absent or null, draw nothing.

## `04` — under the capacity block

On the phone and tablet frames of the Session detail, add the same line under
the capacity block, with the same three shapes and the same absence when the
field is missing. Do not add a second sentence about extra classes.

A refused booking or waitlist join whose problem code is `weekly_cap_reached`
shows «Ya usaste tus clases de esta semana.» in the existing alert, and
nothing else.

## Leave untouched

The seat pill, the capacity numbers, the trainer, the date, and every other
screen. A Plan without a cap adds no line.
