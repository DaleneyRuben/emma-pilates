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

- The iOS frame «Teléfono · Sin crédito» keeps its content; its caption
  becomes **«Teléfono · iOS»** over «Precios de lista».
- The Android frame «Teléfono · Con crédito disponible» stays as the Android
  frame: remove its green notice («Este cliente tiene Bs 60 de crédito
  disponible.» and «Se aplica automáticamente a esta compra.»), and every
  card shows one price, the list price, in the iOS frame's style (Lora 22px,
  weight 500, `#4A4A4A`, no strikethrough, no green): Bs 560, Bs 780,
  Bs 1.050, Bs 2.100. Its caption becomes **«Teléfono · Android»** over
  «Mismos planes y precios».
- The tablet frame drops the green notice, so the context band takes the
  whole row, and its cards show the list prices the same way; its
  sub-caption «Con crédito aplicado» becomes **«Precios de lista»**.
- The description above the frames ends after «…para quién se registra el
  pago.». In the notes card, delete the «Crédito» entry; the «Tablet» entry
  reads «Rejilla de dos columnas bajo la banda de contexto.».

## 2. `S10`

- In «Teléfono · Confirmación» and «Tablet · Confirmación», remove the
  «Crédito aplicado − Bs 60» line. «Precio del plan» stays, and «Monto a
  cobrar en efectivo» equals it: **Bs 350** (the sample Plan price these
  frames already draw).
- The success frame's line reads «Se cobraron Bs 350 en efectivo a Valeria
  Áñez. Su plan ya está activo.».
- The phone confirmation's sub-caption «Desglose con crédito aplicado»
  becomes **«Precio del plan y monto a cobrar»**.
- Delete the «Crédito» entry of the notes card.

## 3. Handoff README

`S09` and `S10` rows lose every mention of Credit.

## Leave untouched

The Plan cards' layout, the context band, «Confirmar pago recibido», the
success state's layout, and every other Staff screen.
