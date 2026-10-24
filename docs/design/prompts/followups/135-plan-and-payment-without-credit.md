# Follow-up — Elegir plan and Detalle del plan without Credit

Targets: **08 (Elige tu plan)**, **09 (Detalle del plan)**, and the
**generated handoff `design/README.md`** (the `08` and `09` inventory rows).
Send [30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by PAY-005 on 2026-10-23. The owner removed the Bs 60 referral
Credit altogether (decisions document §5.3, booking
[ADR-0009](../../../../booking/docs/adr/0009-invite-a-friend-replaces-referral-credit.md)):
nobody earns, holds, or spends Credit any more, so a Plan always costs its
full price. The «Con crédito» variants now show a state the app can never
reach.

## 1. `08` — one catalogue, no Credit banner

Remove the **«Con crédito por referidos»** frame and its banner «Tienes
Bs {{ credit }} de crédito disponible». The **«Sin crédito»** frame stays as
the only catalogue frame; rename its caption to **«Catálogo de planes»**.
Every price is the Plan's own price. In the notes card, delete the
«Crédito» entry («El crédito se aplica una sola vez…») and the Tweaks line
about the Credit amount; the description above the frames reads
**«Catálogo de planes. Cada tarjeta muestra el precio completo del plan.»**

## 2. `09` — the price breakdown is the price

Remove the **«Con crédito aplicado»** frame and its «Crédito aplicado» line.
The **«Sin crédito»** frame stays as the only frame; rename its caption to
**«Detalle del plan»**. The breakdown keeps its two lines (the Plan price and
the total, equal). The description above the frames reads **«Desglose de
precio antes del pago: el total es el precio del plan.»** In the notes card,
delete the two Credit entries («Sin crédito: dos líneas…» and «Con crédito:
la línea de descuento…»).

## 3. Handoff README

- `09`'s inventory row: «Plan detail; the total is the Plan price».
- `08`'s row loses any mention of Credit.

## Leave untouched

Every other frame, the Plan cards themselves, «Continuar al pago», and `10`
(Pago) and `11` (Estado del pago), which already carry no Credit line.
