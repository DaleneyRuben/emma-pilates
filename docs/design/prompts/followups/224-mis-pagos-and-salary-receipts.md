# Follow-up — «Mis pagos» on Perfil and salary payment receipts

Targets: **S23 (Perfil, Staff)**, **AW11 (Nómina)**, **AW12 (Formulario de
Pago de Sueldo)**. Send [30](./30-invariants-checklist.md) and the new
Prompt [S29](../staff/29-trainer-my-pay.md) alongside this follow-up.

---

Written on 2026-11-02. The owner asked on 2026-11-01 to upload a receipt
(«comprobante») when she records a Salary Payment, and that the Trainer see
it in the staff app. This follow-up also applies the S23 half of
follow-up 202 §2, which was never sent: from here on, read S23's «Mis
pagos» row from this follow-up.

## 1. S23 gains «Mis pagos» for a Trainer only

On the Trainer frames of `S23` (iOS and both Android frames), the menu group
gains a first row **Mis pagos**, above «Notificaciones», with the same
21 px Palo de rosa line icon style (a banknote: a rounded rectangle with a
circle) and the quiet chevron. It opens S29. The Administración and
Coordinación frames do not gain it. Nothing else on `S23` changes.

## 2. AW12 gains an optional receipt

Below «Fecha», in the drawer of «Registrar pago» and «Editar pago» and in
the 420 px frame, a field **Comprobante** with «Opcional» beside its label:

- empty: a dashed 1 px `#D8C9BB` box, 96 px high, with an upload glyph and
  «Subir foto del comprobante», and under it in Nota «JPG, PNG o WebP,
  hasta 10 MB. La entrenadora lo ve en su app.»;
- attached (the «Editar pago» frame, whose panel grows from 520 to 640 px
  to keep every field in view): a 56 px thumbnail, «Comprobante
  adjunto» and the upload's day, and two quiet text buttons «Ver» and
  «Cambiar». Changing it keeps the old one in the record; nothing is
  deleted.

Attaching a receipt to a payment already recorded is «Editar pago» with
only this field changed.

## 3. AW11 shows which payments carry a receipt

The desktop table gains a fourth column **Comprobante** after «Fecha»: a
«Ver» link with an image glyph that opens the receipt in the same enlarged
viewer as AW29, or «—» in muted text. At 420 px a card whose payment has
one gains «Con comprobante» in Palo de rosa profundo under the date.

Nothing else on `AW11` or `AW12` changes.
