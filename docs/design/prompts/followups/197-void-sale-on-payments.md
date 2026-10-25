# Follow-up — Anular venta on Pagos

Targets: **AW28 (Pagos)**. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by PAY-006 on 2026-10-23 from decisions §4.3 and booking ADR-0012.
A sale is immutable for the Assistant. Only the Administrator voids it, with
a required reason. The voided sale stays visible and leaves the income
totals. No money is returned.

## `AW28` — the void

The Estado filter gains «Anulado». A confirmed row gains «Anular venta».
The button opens a confirmation that asks for «Motivo» and stays disabled
until the reason has text. The confirmation says the Plan ends, future
Bookings are cancelled, and the money is not returned.

An anulada row shows the pill «Anulado» and the reason under it. It has no
«Anular venta» button. Pending and rejected rows are unchanged.

## Leave untouched

The review panel, the receipt, the pending count beside Pagos, and the
income report's tiles. Do not draw a refund.
