# Follow-up — a front-desk receipt on Confirmar pago

Targets: **S10 (Confirmar pago)**. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by PAY-006 on 2026-10-23 from decisions §4.2 and §4.5 and booking
ADR-0012. An Assistant who sells a transfer at the desk photographs the
Client's receipt. The Payment stays pending and the Administrator approves
it on the existing review (S12). Cash still confirms on the spot. The
invoice card is the smallest match of PAY-007's fields; reconcile the
component when both merge.

## `S10` — receipt and invoice

On the phone and tablet frames, under the Start Date chooser and above
«Confirmar pago recibido», add two cards.

«Datos para la factura». Two pills, «Con factura» and «Sin factura».
«Sin factura» starts selected, and the card then says «Esta venta queda sin
factura.» «Con factura» reveals «NIT o CI» and «Nombre o razón social». Both
can stay empty. Do not add «Factura emitida», a CSV, or a filter.

«Comprobante de transferencia». A note that the photograph stays pending
until an Administrator approves it, and a button «Fotografiar comprobante».
After the photograph, the note becomes «Comprobante listo. El pago queda
pendiente de revisión.»

## Leave untouched

The cash confirmation, the Branch chips, the Start Date chooser, and S12.
Do not draw a second review screen.
