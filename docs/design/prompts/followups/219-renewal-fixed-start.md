# Follow-up — a renewal with classes left has a fixed start

Target: **09 (Detalle del plan)**, its phone frames; the **generated handoff
`design/README.md`** (`09` inventory row). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by FIX-002 on 2026-10-29 ([booking ADR-0005](../../../../booking/docs/adr/0005-validity-in-days-with-a-chosen-start-date.md)).
A Client who renews while her current Plan still has classes (base classes,
extra classes, or a class already booked) does not choose a Start Date: the
new Plan starts the day after the current one ends. Follow-up 190 drew the
«Fecha de inicio» chips for every purchase, so `09` offered a choice the
studio then ignored.

## `09` Detalle del plan

Add one frame, «iOS · Renovación con clases», beside the existing one:

- Under «Qué incluye», in place of the «Fecha de inicio» chip row, one body
  line: «Tu nuevo plan empieza el 25 de septiembre, al terminar el actual.»
  Same style as «30 días de vigencia desde la fecha de inicio.».
- Everything else as the existing frame: the price, the cancellation line,
  the validity line, the desglose, «Siguiente paso», and «Continuar al pago».

The existing frame (chips, «Hoy» selected) stays for a first purchase and
for a renewal with nothing left.

## Leave untouched

Every other screen, and `S10`.
