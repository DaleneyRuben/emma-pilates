# Follow-up — `10`'s QR card shows the studio QR only

Targets: **Client `10`** (the QR card in both frames, «Zona de carga vacía ·
botón deshabilitado» and «Comprobante adjunto · Miniatura visible · botón
habilitado»); **generated handoff `design/README.md`** (the `10` row of the
Client screen inventory). Send [30](./30-invariants-checklist.md) alongside
this follow-up. One block is removed; nothing else changes.

---

Written by PAY-003 on 2026-10-13. Prompt [10](../client/10-payment.md) asked
for a QR code area and the line «Escanea el código con tu app bancaria y
transfiere el monto exacto.», never for bank details, but the generated QR card
prints two lines under the QR: «Emma Pilates Studio S.R.L.» (13 px `#6E6663`)
and «Banco Nacional · Cta. 4501 8823 01» (12 px `#7A716D`, tabular figures). The
app followed them with the beneficiary, bank, and account number from the
backend's configuration. On 2026-10-13 the user decided that clients only scan
the studio's QR: it already carries the beneficiary and account, and the
backend no longer holds those details (the transfer-instructions endpoint keeps
the three fields, always empty, only for older app builds). The amount to type
is still the one printed above the QR, as the Credit entry in
`booking/CONTEXT.md` describes.

## 1. The QR card

In both frames, remove the column under the QR that holds the two lines (the
flex column with the 2 px gap and its two spans). The card keeps everything
else exactly as it is: Blanco `#FFFFFF`, the `#D8C9BB` 1 px border, 16 px
radius, 22 px padding, the soft shadow, the 190 × 190 placeholder QR with its
three finder squares and the «QR del estudio» tag. With nothing left under the
QR the 14 px gap has nothing to separate, so the card ends 22 px under the QR.

Do not add any replacement line, label, or icon inside the card: the QR is the
only transfer instruction.

## 2. The handoff README

In the Client screen inventory, the `10` row's description becomes: «Payment —
transfer to the studio QR + receipt upload (no cash); the QR is the only
transfer instruction, with no beneficiary, bank, or account line».

## What must not change

- The header, the «Monto exacto» card with `Bs {{ amount }}` and «Paquete de 8
  clases», the instruction paragraph «Escanea el código con tu app bancaria y
  transfiere el monto exacto.» under the card, the dashed upload area in both
  states, «Enviar comprobante» and its note, and the tab bar.
- Every other screen, the design system, and every other README section.
