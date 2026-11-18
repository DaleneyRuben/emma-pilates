# Follow-up — Walkthrough finding 106: the staff payout QR (proposals)

Targets: **S23 Perfil** (staff app, iPhone 390), a new staff screen **«Mi QR
de cobro»**, **S29 Mis pagos**, and **P06 Dinero › Sueldos** as follow-up
[273](./273-sueldos-redesign-proposals.md)'s option A draws it (1440 and
420), as proposals only, on a canvas of their own exported to
`design/v2/propuestas-qr-cobro/`. Read with
[225](./225-visual-system-v2.md), [233](./233-admin-web-pages-on-v2.md),
[224](./224-mis-pagos-and-salary-receipts.md),
[95](./95-payment-qr-expand-and-save.md) and 273. Send
[30](./30-invariants-checklist.md) alongside this follow-up. No exported
screen is regenerated here: a later follow-up records what the owner chose.

---

Written on 2026-11-18 for DES-023 and FIX-072 (walkthrough finding 106).

## Why

Administration pays salaries by bank transfer. The owner wants each member
of the team who is paid a salary to upload the QR of her bank account, so
Administration pays by scanning it, uploads the receipt, and the person sees
it in «Mis pagos». The receipt already exists (Sueldos › Pagados, «Pagos
recibidos» in S29). The QR does not. Bank QRs in Bolivia expire, so the
person also says until when hers is valid, gets a reminder before and on
that day, and an expired QR is never offered for payment.

## What every option keeps

- **Who.** Every staff role sees «Mi QR de cobro»; it is optional.
- **Uploading.** Camera or photo library, JPG/PNG/WebP up to 10 MB, drawn
  whole (never cropped, as 95 draws the studio QR). After the photo the app
  asks **«¿Hasta cuándo vale?»** with a date picker; the date must be after
  today. «Guardar QR» saves both. Replacing the QR repeats both steps; the
  old one stays in the record (nothing is deleted).
- **States** (the same words on every surface):
  - none: «Todavía no subiste tu QR de cobro» / web «Daniela todavía no
    subió su QR de cobro. Pídele que lo suba en la app, en Perfil › Mi QR
    de cobro.»;
  - valid: «Vale hasta el 15/12/2026»;
  - expiring (7 days or fewer): «Vence el 15/12 · sube uno nuevo», amber;
  - expired: «Venció el 15/12 · sube uno nuevo» / web **«QR vencido ·
    pídele uno nuevo»**, and the web never draws an expired QR.
- **Reminders** (push and inbox, one each, to the person): 7 days before,
  «Tu QR de cobro vence el 15/12, sube uno nuevo»; on the day, «Tu QR de
  cobro venció hoy, sube uno nuevo para que podamos pagarte». Tapping opens
  «Mi QR de cobro». A new QR cancels the pending reminders of the old one.
- **On the web** the QR is drawn with **Ampliar** and **Guardar QR** as the
  studio QR card draws them (95), with «QR de cobro de Daniela Ortiz · vale
  hasta el 15/12/2026» under it. The QR is shown where a salary is
  approved (273 A's «Aprobar pago») and in Pagados' «Registrar pago» panel
  as soon as an Empleado is chosen.
- **After paying,** the flow leads to the receipt that Pagados already
  takes (JPG/PNG/WebP up to 10 MB) and the person already sees in S29.
- 273 A's card, confirmation copy, wait notes and amounts as 273 states
  them.

## The canvas

`Main.dc.html` states the three options (A recommended). Each option has a
clickable staff-app board (iPhone 390) and web boards at 1440 and 420. A
dark strip at the top of each board is the prototype's control and not part
of the design; its chips jump to the states above.

1. **A · Una fila y su pantalla** (recommended).
   - App: «Mi QR de cobro» is a row in Perfil › Ajustes with its state at
     the right («Vale hasta 15/12», «Vence el 15/12» amber, «Vencido» red,
     «Sin subir»). It opens its own screen: the QR whole in a white card,
     the state line, **Cambiar QR** (or **Subir mi QR**), and a short note
     «Administración lo usa para pagarte tu sueldo.»
   - Web: the «Aprobar pago» confirmation grows a left column with the QR
     card, or the notice in place of the QR. After approving, the notice
     says «Aprobamos … ¿Ya le transferiste?» with **Subir comprobante**,
     which opens Pagados' panel for that payment.
2. **B · Tarjeta en Perfil**.
   - App: a card right under the photo in Perfil with a QR thumbnail, the
     state line and **Cambiar** / **Ver**; no screen of its own (Ver opens
     the QR full screen, Cambiar runs the upload).
   - Web: 273 A's person card shows «QR de cobro · vale hasta 15/12» with
     **Ver QR** beside the total (or the notice chip); Ver QR opens a
     dialog with the QR. The confirmation is 273's, unchanged. An approved
     card shows **Subir comprobante** in place of «Aprobar pago».
3. **C · Dentro de Mis pagos, pago en pasos**.
   - App: the QR lives at the top of «Mis pagos» as «Así te pagamos», above
     «Pagos recibidos»; Perfil has no new row (non-trainers, who have no
     Mis pagos, get the row of A).
   - Web: «Aprobar pago» opens a three-step dialog: **1 Revisar** (273's
     confirmation), **2 Pagar** (the QR large, Ampliar, Guardar QR),
     **3 Comprobante** (the upload, or «Lo subo después»).

At 420 the web dialogs become bottom sheets as 273 draws them.

## Keep

273's other states, Pagados' table, S29's «Pagos recibidos», the studio QR
(Ajustes › QR del estudio); the brand, colours and type of 225.
