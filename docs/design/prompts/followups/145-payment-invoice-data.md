# Follow-up — `10` asks for the invoice data

Targets: **Client `10` (Pago por transferencia)**, both existing frames and
one new third frame, «Con factura»; the **generated handoff
`design/README.md`** (the `10` row of the Client screen inventory). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by PAY-007 on 2026-10-23. The owner issues invoices outside the
system (no SIAT integration) and asked that every sale record the tax
identity the client wants on her invoice: a **NIT or CI** and a **name or
business name**, prefilled from her last sale, and optional: «Sin factura»
is allowed (owner, 2026-10-23; booking glossary «Invoice Data»,
[booking ADR-0012](../../../../booking/docs/adr/0012-sales-controls-and-invoice-data.md)).
`10` is where the client completes a QR purchase, so the data is asked here,
before «Enviar comprobante». The Assistant's cash sale asks the same on `S10`
([146](./146-cash-payment-invoice-data.md)). The word is «factura» only as the
studio's own invoice; the app never says it issues one.

## 1. The «Datos para la factura» card (both existing frames)

A new card between the upload area and the «Enviar comprobante» button, on
the same flat card as the amount card (Blanco `#FFFFFF`, 1 px `#D8C9BB`
border, 16 px radius, 20 px padding, no shadow), with 14 px between its
parts:

- **Title** «Datos para la factura» in Work Sans 16 weight 500 `#4A4A4A`.
- **A two-option choice** under it: two pills on one row, 8 px apart,
  «Con factura» and «Sin factura», each 40 px tall, fully rounded, Work Sans
  14, padding 0 16 px. The selected pill is Palo de rosa `#B78380` with white
  text; the other has a 1 px `#D8C9BB` border, transparent fill, and
  `#6E6663` text (the chips `S10` already uses for its Branch choice). Screen
  readers hear them as two buttons with a selected state.
- **«Sin factura» selected** (both existing frames): only the note «Tu
  compra se registra sin datos de factura.» in Work Sans 13 `#766D69` under
  the pills.

The two existing frames select «Sin factura»: a first purchase has nothing
to prefill. Everything else in them stays as it is.

## 2. New frame — «Con factura»

A third iPhone frame after the existing two (and before «QR ampliado» of
[95](./95-payment-qr-expand-and-save.md)), captioned «Con factura» /
«Datos de la última compra». It copies the «after» frame (thumbnail
attached, button enabled) and draws the card with «Con factura» selected:

- Two form fields under the pills, the design system's text field (the
  uppercase 11 px `#766D69` label with 1.54 letter spacing above a 52 px
  Blanco input with a 1 px `#D8C9BB` border and 8 px radius, Work Sans 16
  `#4A4A4A`), 12 px apart:
  - «NIT O CI» with the value «4567891».
  - «NOMBRE O RAZÓN SOCIAL» with the value «Ana Pérez».
- Under them, the note «Usamos los datos de tu última compra. Puedes
  cambiarlos.» in Work Sans 13 `#766D69`.

«Enviar comprobante» stays enabled. In the notes card, add: «**Factura** ·
Con «Con factura», NIT o CI y nombre son obligatorios y «Enviar comprobante»
espera a ambos; vienen de la última compra de la clienta que los tuvo. «Sin
factura» envía la compra sin datos (PAY-007).»

## 3. README

The `10` row of the Client screen inventory gains: «; a «Datos para la
factura» card before «Enviar comprobante» chooses «Con factura» (NIT o CI and
nombre o razón social, prefilled from her last sale) or «Sin factura»
(PAY-007)».

## What must remain untouched

The amount card, the QR card and its two actions (90, 95), «QR ampliado»,
the upload area and its two states, the header and tab bar, the button's
copy and colours, and every other Client screen.
