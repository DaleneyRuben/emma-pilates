# Follow-up — The Assistant's Plan choice and cash Payment without Credit

Targets: **S09 (Elegir plan · Asistente)**, **S10 (Confirmar pago en
efectivo · Asistente)**, and the **generated handoff `design/README.md`**
(the `S09` and `S10` inventory rows). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by PAY-005 on 2026-10-23. Credit is retired (booking
[ADR-0009](../../../../booking/docs/adr/0009-invite-a-friend-replaces-referral-credit.md)):
the Assistant always collects a Plan's full price in cash.

## 1. `S09`

Remove the **«Teléfono · Con crédito disponible»** frame, its green notice
«Este cliente tiene Bs 60 de crédito disponible.», and the per-card
«Con crédito aplicado» lines; remove the same notice from the tablet frame,
so the context band takes the whole row. The **«Teléfono · Sin crédito»**
frame stays; rename its caption to **«Teléfono»**. The description above the
frames ends after «…para quién se registra el pago.». In the notes card,
delete the «Crédito» entry and, in the «Tablet» entry, «y el aviso de
crédito comparten fila».

## 2. `S10`

Remove the **«Desglose con crédito aplicado»** frame and the «Crédito
aplicado − Bs 60» line wherever it is drawn. The summary shows the Plan and
the amount to collect, which is its price. Delete the «Crédito» entry of the
notes card.

## 3. Handoff README

`S09` and `S10` rows lose every mention of Credit.

## Leave untouched

The Plan cards, the context band, «Registrar pago», the success state, and
every other Staff screen.
