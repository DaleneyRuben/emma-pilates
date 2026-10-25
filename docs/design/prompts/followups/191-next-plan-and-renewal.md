# Follow-up — Next plan and renewal

Targets: `12` (Mi plan), `19` (Notificaciones), and `S06` (Ficha de la
clienta). Send [30](./30-invariants-checklist.md) alongside.

---

Written by BKM-006 on 2026-10-23 ([booking ADR-0005](../../../../booking/docs/adr/0005-validity-in-days-with-a-chosen-start-date.md)).
A Client with a Plan in force can buy the next one. Mi plan names it, the
expiry reminder invites the renewal, and the Assistant's cash action stays
available.

## `12` Mi plan

- When a future Subscription exists, add one line under the dates:
  «Siguiente plan desde {date}».
- Replace «Podrás comprar un plan nuevo cuando este termine.» with a
  «Renovar plan» button.
- The expiring-soon note reads «Renueva cuando quieras y elige tu fecha de
  inicio.» Keep «Tu plan vence el {date}.»

## `19` Notificaciones

- The renewal reminder body reads «Tu plan vence en 3 días. Renueva cuando
  quieras y elige tu fecha de inicio.»

## `S06` Ficha de la clienta

- «Registrar pago en efectivo» stays enabled while the current Plan is in
  force. Disable it, with the note «Ya tiene un plan siguiente.», only when a
  future Plan is already queued. Remove «Podrá comprar otro plan cuando este
  termine.»

## Leave untouched

The allowance card, the badges, and every other screen.
