# Follow-up — the simulator splits the Client price and Trainer pay

Target: **the Simulador page** (admin web, STU-004; follow-ups 202 and 205
are still pending, so this joins them when that page is first drawn). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by FIX-008 on 2026-10-30 (review: the simulator used one price for
the Client and for the Trainer's pay, and ignored the Bs 8 per extra
student of BKO-006).

## Inputs

Replace «Precio por clase (Bs)» with four fields, in this order:
- «Precio por clase para la clienta (Bs)», default 70;
- «Pago por clase a la instructora (Bs)», default 65;
- «Alumnas incluidas en el pago», default 4;
- «Pago por alumna extra (Bs)», default 8.

## Result

With the opening values, «Resultado» reads Bs 3.163,60. The 3-month Base
income reads Bs 120.120,00. Every other line and the projection stay as 205
describes.
