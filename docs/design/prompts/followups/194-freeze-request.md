# Follow-up — Freeze request on Mi plan

Targets: `12` (Mi plan), `04` (Detalle de sesión). Send [30](./30-invariants-checklist.md) alongside.

---

Written by BKM-012 on 2026-10-23 ([booking ADR-0010](../../../../booking/docs/adr/0010-freeze-quarterly-subscriptions.md)).
A Client on a Plan of 90 days or more may ask once, for up to 15 days, never
starting in the past. The Administrator decides.

## `12` Mi plan

- When the current Plan lasts 90 days or more and has no Freeze yet, add a
  form under the dates: «Congelar plan», «Inicio del congelamiento», «Fin del
  congelamiento», «Motivo», and «Solicitar congelamiento».
- A pending request replaces the form with «Tu solicitud de congelamiento está
  en revisión.»
- An approved Freeze replaces it with «Tu plan está congelado hasta el
  {fecha}.», written as Mi plan already writes dates.
- A refused request, a Plan under 90 days, and an expired Subscription show
  no form. The refusal the API returns is «Este plan no se puede congelar.»

## `04` Detalle de sesión

- A booking refused because the Session falls inside an approved Freeze shows
  «Tu plan está congelado hasta el {fecha}.» and does not create the Booking.

## Leave untouched

The founder banner, «Siguiente plan desde …», the badges, and every other
screen.
