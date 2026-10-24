# Follow-up — `S10` takes the invoice data with the cash

Targets: **S10 (Confirmar pago en efectivo · Asistente)**, the «Confirmación»
frame and one new frame, «Confirmación · Con factura»; the **generated
handoff `design/README.md`** (the `S10` inventory row). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by PAY-007 on 2026-10-23, together with
[145](./145-payment-invoice-data.md). A cash sale at the front desk records
the same Invoice Data as the client's own QR purchase: a NIT or CI and a name
or business name, prefilled from the client's last sale, or «Sin factura»
(owner, 2026-10-23; booking glossary «Invoice Data», booking ADR-0012). The
Assistant asks the client at the counter and types it here before taking the
cash.

## 1. The «Datos para la factura» card («Confirmación»)

Between the price breakdown card (and the Branch chips when there are
several) and the note «Confirma solo cuando tengas el efectivo en mano…», a
card with the price card's surface (Blanco `#FFFFFF`, 1 px `#D8C9BB` border,
16 px radius, 16 px padding, the soft card shadow) holding, 12 px apart:

- **Title** «Datos para la factura» in Work Sans 16 weight 500 `#4A4A4A`.
- **The same two pills** as `10` (145 §1): «Con factura» and «Sin factura»,
  40 px tall, fully rounded; selected Palo de rosa `#B78380` with white text,
  the other outlined `#D8C9BB` with `#6E6663` text, exactly the Branch
  chips' look.
- With «Sin factura» selected, the note «La venta se registra sin datos de
  factura.» in Work Sans 13 `#766D69`.

The existing «Confirmación» frame selects «Sin factura» (this client has no
earlier sale with invoice data).

## 2. New frame — «Confirmación · Con factura»

A frame after «Confirmación», captioned «Confirmación · Con factura» /
«Datos de la última compra de la clienta». It copies «Confirmación» and draws
the card with «Con factura» selected: the design system's two text fields,
«NIT O CI» with «1020304050» and «NOMBRE O RAZÓN SOCIAL» with «Estudio Ana
SRL», then the note «Datos de su última compra. Confírmalos con la clienta.»
in Work Sans 13 `#766D69`. «Confirmar pago recibido» stays enabled.

Add to the notes card: «**Factura** · Con «Con factura», NIT o CI y nombre
son obligatorios antes de «Confirmar pago recibido»; vienen de la última
compra de la clienta que los tuvo. «Sin factura» registra la venta sin datos
(PAY-007).»

## 3. README

The `S10` inventory row gains: «; a «Datos para la factura» card («Con
factura» with NIT o CI and nombre, prefilled from the client's last sale, or
«Sin factura») before the cash is confirmed (PAY-007)».

## What must remain untouched

The «Confirmado» frame (no invoice line is added to the success summary), the
price breakdown card, the Branch chips, the header, the centred-card tablet
layout, and every other Staff screen.
