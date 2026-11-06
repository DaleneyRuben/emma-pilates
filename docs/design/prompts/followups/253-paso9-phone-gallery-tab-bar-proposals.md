# Follow-up — Second walkthrough, Paso 9: phone prompt, receipt from the gallery, tab bar, next plan date (proposals)

Targets: **C02 Inicio** and **C22 Editar perfil** (Client app v2), **S06
Resumen de la clienta**, **S10 Registrar pago** (cash and QR), **S10
Comprobante enviado** and **S21 Reservas de la clienta** (Staff app v2), and
**C09 Detalle del plan** (Client app v2), as proposals only, on a canvas of
their own exported to `design/v2/propuestas-paso9/`. Read with
[225](./225-visual-system-v2.md), [236](./236-phone-field-prefix-with-flag.md)
and [246](./246-client-payment-in-review-state.md). Send
[30](./30-invariants-checklist.md) alongside this follow-up. No exported
screen is regenerated here: follow-up [254](./254-paso9-approved-options.md)
records what the owner chose.

---

Written on 2026-11-06 for DES-013 (second walkthrough, Paso 9, findings 32–40).

## Why

- **n.º 34.** Clients registered before the phone rule have no mobile number
  (Lucía) or an invalid one (`7000004`, 7 digits). The owner (2026-11-06):
  the Client app asks them for a valid one. Same field as C01b and C22
  (follow-up 236: flag prefix, Bolivia by default, 8 digits starting with 6
  or 7).
- **n.º 38.** The front-desk receipt (S10 › QR) can only be photographed. The
  owner (2026-11-06): the receptionist may also pick it from the gallery, for
  a receipt the Client sent by WhatsApp.
- **Tab bar.** The Staff app hides its bottom bar on every screen below a tab
  root. The platform norm keeps it while browsing and hides it inside a task.
- **n.º 35, 37, 32 (common part, no options).** With a plan in force, the
  next plan now picks its start date too, from the day after the current one
  ends up to four weeks later (booking ADR on advance plans). «Comprobante
  enviado» says the plan is scheduled and from which day. The client file's
  button reads «Registrar pago».

## The canvas

`Main.dc.html` (1440 wide) with one section per open question, three cards
each (A recommended), every card linking to clickable 390 × 844 boards.

1. **Phone (T-…)**: A · a sheet over Inicio when the app opens («Agrega tu
   celular» or «Revisa tu celular», field, «Guardar», «Ahora no»; it comes
   back on the next app open until saved). B · a «Falta tu celular» card on
   Inicio that opens C22 with the field marked. C · a full screen before the
   app that cannot be skipped. Each ends on Inicio with «Celular guardado».
2. **Gallery (G-…)**: A · two buttons in the receipt card, «Fotografiar
   comprobante» and «Elegir de la galería». B · one «Agregar» that opens the
   system action sheet (Tomar foto · Elegir de la galería · Cancelar). C · two
   tiles side by side. All end on «Comprobante listo» with «Cambiar».
3. **Tab bar (B-…)**: offered as A (bar while browsing, hidden in tasks),
   B (bar always) and C (as today). The owner chose A before the canvas went
   out, so only A's three boards were drawn, under the common part.
4. **Common part (R-…)**: R1 S10 cash for Rocío with a plan in force, the
   «Fecha de inicio» strip from 6 December and the line «El plan actual de
   Rocío vence el 5 de diciembre. El nuevo empieza el 10 de diciembre; se
   puede elegir hasta el 2 de enero.»; R2 the same strip on C09; R3
   «Comprobante enviado» with «Administración lo revisa y programa el plan
   siguiente de Rocío, que empieza el 10 de diciembre.» and an «Empieza» row.

Untouched: everything else on these screens, the v2 tokens, the brand
«Emma Pilates Studio».
