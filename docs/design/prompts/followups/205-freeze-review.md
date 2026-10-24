# Follow-up — Freeze review

Targets: the admin sidebar, a new Congelamientos list beside Fundadoras, and
the Administrator's Staff stack (the review opened from a push). Send
[30](./30-invariants-checklist.md) alongside.

---

Written by BKM-012 on 2026-10-23 ([booking ADR-0010](../../../../booking/docs/adr/0010-freeze-quarterly-subscriptions.md)).
Approval stays with the Administrator. Assistant, Trainer, Nutritionist, and
Client never see the decision.

## Admin web

- Add «Congelamientos» under Back Office, after Fundadoras. It lists pending
  requests: the Client's name, the Plan, the dates, the reason, «Aprobar»,
  and «Rechazar».
- An empty list reads «No hay solicitudes pendientes.»
- At 420 px each request is a card behind «Abrir menú». At 1440 px the same
  cards sit in the main column. No create action: the Client asks from Mi plan.

## Staff app

- The Administrator's push «Congelamiento por revisar» opens a review with
  the same facts and the same two actions. After either action the line is
  «Listo. La clienta ya fue avisada.»
- The Client's result push reads «Tu plan está congelado hasta el {fecha}.»
  when approved and «Tu solicitud de congelamiento fue rechazada.» when refused.

## Leave untouched

Fundadoras, Pagos, and every other role's stack.
