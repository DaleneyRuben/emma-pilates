# Follow-up — the Plan end reads «Vence el»

Targets: `02` (Inicio, the plan card) and `12` (Mi plan, the dates block).
Send [30](./30-invariants-checklist.md) and [175](./175-plans-by-days-admin.md)
alongside.

---

Written by BKM-005 on 2026-10-23. The Subscription now ends on the Start Date
plus the Plan's days minus one ([booking ADR-0005](../../../../booking/docs/adr/0005-validity-in-days-with-a-chosen-start-date.md));
«Pagado hasta» described a month that was paid for, which no longer holds.
The end is the last day the client can use the Plan, so it is named as an
expiry everywhere, matching the «Tu plan vence el …» notice `12` already has
and `S06`'s «Vence el …».

## `02` Inicio

- The plan card's date line «Pagado hasta el 30 de agosto» becomes «Vence el
  30 de agosto».

## `12` Mi plan

- In the dates block, the label «Pagado hasta» becomes «Vence el»; an
  expired Subscription keeps «Venció el». The «Inicio» label and both dates
  stay as they are.

## Leave untouched

The progress ring and counts, the state pills («Activa», «Por vencer»), the
3-day notice, the quick links, the tab bar, and every other screen.
