# Follow-up — Start Date chip row

Targets: `09` (Detalle del plan) and `S10` (Confirmar pago en efectivo). Send
[30](./30-invariants-checklist.md) alongside.

---

Written by BKM-006 on 2026-10-23 ([booking ADR-0005](../../../../booking/docs/adr/0005-validity-in-days-with-a-chosen-start-date.md)).
The Start Date is chosen at purchase. The chooser is a JavaScript chip row,
never a native date picker.

## `09` Detalle del plan

- Replace «{d} días de vigencia desde que se confirma tu pago.» with «{d} días
  de vigencia desde la fecha de inicio.»
- Under «Qué incluye», add a chip row labelled «Fecha de inicio». The first
  chip reads «Hoy» and is selected. The next chips show the weekday and the
  day number in Spanish («lun 26», «mar 27»), today first, through today plus
  14 days. When the studio Opening Date is still ahead and sits past those 14
  days, one more chip reads «Día de apertura».
- Leave the price, the desglose, the cancellation line, and the payment note.

## `S10` Confirmar pago en efectivo

- Add the same chip row, labelled «Fecha de inicio», above the branch chips.
  «Hoy» is selected. The Assistant can renew a Plan that is still in force, so
  do not draw a disabled state for an active Plan.

## Leave untouched

Every other screen, the tab bar, and the success state of `S10`.
