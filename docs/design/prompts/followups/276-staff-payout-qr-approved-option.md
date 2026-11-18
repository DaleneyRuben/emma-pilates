# Follow-up — Walkthrough finding 106: the owner's choice

Targets: the same surfaces as [275](./275-staff-payout-qr-proposals.md).
A decision record over the export in `design/v2/propuestas-qr-cobro/`; no
board is regenerated. Send [30](./30-invariants-checklist.md) alongside.

---

Written on 2026-11-18 for DES-023 and FIX-072. The owner chose **A · Una
fila y su pantalla** («vamos con la A», relayed by the walkthrough session).

## Staff app

As `Telefono.dc.html` draws it:

- **Perfil › Ajustes** gains the row **Mi QR de cobro** (QR icon) first in
  the list, for every staff role. Its value at the right: «Vale hasta
  15/12», «Vence el 5/12» (amber, 7 days or fewer), «Vencido» (error red,
  semibold) or «Sin subir».
- The row opens the screen **Mi QR de cobro**: back «Perfil» (or
  «Notificaciones» when opened from one), the title, the note «Administración
  lo usa para pagarte tu sueldo. Los QR del banco vencen: cuando subas uno
  nuevo, dinos hasta cuándo vale y te avisamos antes de que venza.»
  - With a QR: the QR whole in a white card (95's proportions rule), under it
    the state line («Vale hasta el 15/12/2026», «Vence el 5/12 · sube uno
    nuevo», «Venció el 15/12 · sube uno nuevo»), tapping the QR opens it
    full screen; then **Cambiar QR** (secondary).
  - Expiring or expired: a banner above the card, amber «Tu QR vence el
    5/12. Sube uno nuevo antes para que no se atrase tu pago.» or red «Tu QR
    venció el 15/12. Administración no puede usarlo para pagarte: sube uno
    nuevo.»
  - Without one: the empty card «Todavía no subiste tu QR de cobro» / «Una
    foto o captura del QR de tu banco para recibir pagos.» and **Subir mi
    QR** (primary).
- Uploading: the sheet «Sube tu QR de cobro» with «Elegir de la galería»,
  «Tomar foto», «Cancelar»; then the sheet **«¿Hasta cuándo vale?»** with the
  photo's thumbnail, «Lo dice tu banco al generar el QR.», a calendar (days
  from tomorrow), «Vale hasta el 15/01/2027. Te avisaremos 7 días antes y ese
  día.», **Guardar QR** and «Cancelar». After saving: «Guardamos tu QR. Vale
  hasta el 15/01/2027.»
- Reminders, push and inbox, opening this screen: «Tu QR de cobro vence
  pronto» / «Tu QR de cobro vence el 5/12, sube uno nuevo.» seven days
  before; «Tu QR de cobro venció» / «Tu QR de cobro venció hoy, sube uno
  nuevo para que podamos pagarte.» on the day.

## Admin web

As `Web.dc.html` (1440) and `WebA420.dc.html` (420) draw it, on 273's option
A (follow-up 274):

- The **Aprobar pago** confirmation grows to 820 px with a 280 px left
  column: the QR card (white, 95's Ampliar and Guardar QR, caption «QR de
  cobro de Daniela Ortiz» / «Vale hasta el 15/12/2026», an amber «Vence
  pronto» pill within 7 days), or in its place the notice «Sin QR de cobro» /
  «Daniela todavía no subió su QR de cobro. Pídele que lo suba en la app, en
  Perfil › Mi QR de cobro.», or the red notice «QR vencido · pídele uno
  nuevo» / «El QR de Daniela venció el 15/12/2026. No lo mostramos para que
  no le transfieras a una cuenta que ya no sirve.» At 420 the column stacks
  above the details in the bottom sheet.
- After approving, the success notice adds «¿Ya le transferiste? Sube el
  comprobante y Daniela lo verá en su app.» with **Subir comprobante**, which
  opens Pagados' panel for that payment (the existing receipt field).
- **Pagados › Registrar pago** (and the correction panel) shows the same QR
  card or notice under «Empleado» as soon as a person is chosen.
- **Ampliar** opens the QR full screen on a light background with «Guardar
  QR»; **Guardar QR** downloads the file as `qr-cobro-<nombre>.<ext>`.
