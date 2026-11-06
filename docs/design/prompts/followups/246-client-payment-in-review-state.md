# Follow-up — The client app's «pago en revisión» and «pago rechazado» states

Targets: the v2 client canvas (`design/v2/cliente/`): new boards **C02c**,
**C02d**, **C04c**, **C04d**, **C04e**, **C04f** and **C10c**, their places
in `canvas.json`, and the «Volver al inicio» links of `C11` and `C11c`. Send [30](./30-invariants-checklist.md) alongside.

---

Written on 2026-11-05 for DES-010 (walkthrough 2026-11-04, findings n.º 19,
22 and 23). After Mariana sent her first transfer receipt, Inicio still said
«Elige tu plan y empieza a moverte» with **Comprar un plan**, the booking
shortcut said «Necesitas un plan activo», and the class detail said «No te
quedan clases en tu plan.» although she never had one. The server already
refuses a second purchase while a Payment is pending review
(`payment_pending_exists`), so the app was inviting a purchase that fails at
the end.

The owner decided (2026-11-05): a payment in review is a state of its own.
Inicio says so, the booking entry points say so, and every **Comprar un
plan** leads to that payment instead of starting another purchase. A
rejected receipt does the same, leading to «Subir otro comprobante».

Use the Client's real data from the walkthrough: Mariana, **Paquete de 8
clases**, **Bs 502** (590 − 88 founder discount), Thursday 5 November.

## 1. C02c · Inicio · pago en revisión

`C02b` with two changes; everything else (header, promotions, the two tiles,
the tab bar) stays as `C02b` draws it.

- **The hero** keeps C02b's Rosa profundo `#93615D` card, 20 px radius,
  20 px padding and the 64 px line illustration on the right, but the
  illustration becomes `C11`'s hourglass at 64 px, in the same white 45 %
  stroke. Content,
  top to bottom, gap 12 px:
  - the pill «En revisión» where C02b has «Desde Bs 80»;
  - the title «Tu pago está en revisión» (Lora 24);
  - the line «Paquete de 8 clases · Bs 502» (Work Sans 14, white 85 %);
  - the line «Te avisamos apenas el estudio lo confirme.» (Work Sans 14,
    white 85 %);
  - the white pill button «Ver estado del pago» → `C11`.
  The whole card is the same link to `C11`. There is no **Comprar un plan**.
- **Accesos rápidos.** The locked «Reservar una clase» row keeps its 60 %
  opacity and the lock, with the note «Tu pago está en revisión».

## 2. C02d · Inicio · pago rechazado

`C02c`'s layout with:

- the pill «Pago rechazado»; the title «No pudimos confirmar tu pago»; the
  admin's reason as one line («El monto del comprobante no coincide con el
  plan.», at most two lines, ellipsis after); the line «Paquete de 8 clases ·
  Bs 502»; the white pill button «Subir otro comprobante» → `C10` (a new
  payment of the same plan). The illustration is the receipt from
  «¿Necesitas factura?» drawn at 64 px in the same white 45 % stroke.
- The locked booking row's note: «Tu pago no se confirmó».

## 3. C04 · the four reasons Reservar is off

`C04`'s class (Mat Pilates, Martes 3 de noviembre, 08:00 – 08:50, 2 de 12
cupos libres) with only the footer changed. Each footer is C04's: a 13 px
muted centred note, the 52 px primary button, plus a 44 px text button in
Palo de rosa oscuro `#7D4F4B` 15/600 below. **Reservar** is drawn disabled as
`C10` draws a disabled primary (`#E6DBD0` fill, `#6F6662` label).

| Board | Case | Note | Text button |
|---|---|---|---|
| C04c | No plan (never bought, or the last one ended) | «Necesitas un plan para reservar.» | «Comprar un plan» → `C08` |
| C04d | A plan with no classes left | «No te quedan clases en tu plan.» | «Comprar un plan» → `C08` |
| C04e | A payment in review | «Tu pago está en revisión. Podrás reservar cuando el estudio lo confirme.» | «Ver estado del pago» → `C11` |
| C04f | The last receipt was rejected | «No pudimos confirmar tu pago.» | «Subir otro comprobante» → `C10` |

A payment in review or a rejection wins over the two plan cases: a Client
whose plan has no classes left and who already sent a renewal sees `C04e`.

## 4. C10c · Pago · factura sin completar

`C10b` with the receipt attached and **¿Necesitas factura?** open, but both
fields empty (placeholders only, no «Usamos los datos de tu última compra»
line). The footer note above **Enviar comprobante** reads «Completa el NIT o
CI, o cierra la factura» instead of «El estudio revisa tu pago y te avisa por
la app», and the button is drawn disabled as in `C10`. The disclosure's
header links to `C10`, as on `C10b`. The note is not red: nothing failed, the
Client only has to finish or close the invoice.

## 5. Where Comprar un plan leads

In the prototype links: while a payment is in review, every **Comprar un
plan**, **Renovar mi plan** and **Ver planes** goes to `C11` instead of
`C08`; with a rejected receipt, to `C11c`. Draw this as links only on the new
boards (`C02c`, `C02d`, `C04e`, `C04f`); `C08` itself is unchanged, and the
app opens Estado del pago instead of Elegir plan when one of these states
holds. `C11`'s «Volver al inicio» goes to `C02c`, and `C11c`'s to `C02d`.

## 6. Canvas

Place the new boards in free slots, 390 × 844, interactive: `C02c` at
(1410, 4156), `C02d` (1880, 4156), `C04c` (2350, 4156), `C04d`
(2820, 4156), `C04e` (1880, 6384), `C04f` (2350, 6384), `C10c`
(2820, 6384). Titles: «C02 Inicio · pago en revisión», «C02 Inicio · pago
rechazado», «C04 Detalle · sin plan», «C04 Detalle · sin clases», «C04
Detalle · pago en revisión», «C04 Detalle · pago rechazado», «C10 Pago ·
factura sin completar». Add them to `order` after their siblings.

## Leave untouched

Every existing board's content (C02, C02b, C04, C04b, C08–C12) apart from
the two «Volver al inicio» links in §5, the tab bar, the design system and
`design/README.md`. The brand is «Emma Pilates Studio»; no tagline.
