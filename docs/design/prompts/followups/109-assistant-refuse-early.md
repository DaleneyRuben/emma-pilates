# Follow-up — The Assistant's flows refuse early

Targets: **S06 (Resumen del cliente · Asistente)**, **S07 (Reservar una
clase · Asistente)**, **S08 (Detalle de sesión · Asistente)**, and the
**generated handoff `design/README.md`** (the `S06`, `S07`, and `S08`
inventory rows and the «Seat pills» rules). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by UX-003 on 2026-10-22 from the UI/UX audit
([UX-001](../../UX-001-uiux-audit.md), findings S2 and S3). Two Assistant
flows refuse at the last tap what the app already knew: the Session the
Client is already booked into opens from `S07` like any other and `S08`
offers «Reservar», which the API refuses afterwards; and «Registrar pago en
efectivo» on `S06` is enabled for a Client whose Plan is active, so the
Assistant walks `S09` and `S10` to read «El cliente ya tiene un plan
activo.». The rule is the Client app's (`12`: «mientras el plan siga vigente
no se puede comprar otro») and the API's (`subscription_not_expired`). The
apps now say so before the tap; the frames must draw it.

## 1. `S07` — the «Ya reservada» row

In the interactive **«Teléfono · Listado»** frame, the 09:30 – 10:30 **Mat
Pilates** Session of «Jueves 13 de agosto» (Camila Áñez, today «4 cupos») is
the class the Client already holds a Booking in: its pill reads **«Ya
reservada»** on the full-class tones of the seat-pill rule
(`rgba(216,201,187,0.34)` behind `#6E6663`, 12px weight 500, padding 7px
13px, fully rounded) instead of the count. The row keeps its card, Trainer
line, and chevron: it still opens `S08`, which draws the booked state (§2).
Nothing else about the pill logic changes: «N cupos» on Palo de rosa tinte,
«Completa» on the neutral pill. In the static **«Tablet · Sesiones en dos
columnas»** frame the same card («09:30 – 10:30 · Mat Pilates · Camila
Áñez») swaps its «4 cupos» pill for «Ya reservada» in the same tones. The
Android frame (Urubó) does not change. A Waitlist entry is not a Booking:
a class she only waits for keeps its count.

Add to the notes card: «**Ya reservada** · La clase que la clienta ya tiene
reservada lleva la píldora neutra «Ya reservada» en lugar del conteo y abre
S08 sin «Reservar» (UX-003).»

## 2. `S08` — the booked frame

A **fourth phone frame**, captioned **«Teléfono · Ya reservada»** with the
sub-caption «Sin botón: la clienta ya tiene esta clase», placed after
«Teléfono · Sin clases en el plan» and before the tablet frame. It copies the
«Cupos disponibles» iOS frame exactly (header, banner, the facts card, the
capacity box «4 de 10 cupos disponibles» beside «Con cupos») and replaces the
sticky action zone's content: no button, only the note **«La clienta ya tiene
esta clase reservada.»** in 13px `#766D69`, centred, inside the same sticky
area (border-top 1px `#D8C9BB`, padding 16px 20px 34px). The seats stay on
the Palo de rosa pill: the box reports the class, the note reports her. The
other three frames and the tablet frame do not change.

Add to the notes card: «**Ya reservada** · Si la clienta ya tiene esta clase,
la zona de acción muestra solo «La clienta ya tiene esta clase reservada.»;
los estados de clase llena y sin clases en el plan no cambian (UX-003).»

## 3. `S06` — the disabled cash action

In the **«Teléfono · Suscripción activa»** iOS frame, «Registrar pago en
efectivo» becomes the disabled outlined button the tablet frame already uses
for «Reservar clase» (`disabled`, 1px `#E4DAD0` border, transparent, text and
icon `#B9AFA9`, cursor not-allowed, same 54px height and radius 10), and
under it, inside the same actions column, the note **«Podrá comprar otro plan
cuando este termine.»** in 12px `#766D69`, centred (the tablet frame's
«Necesita un plan activo para reservar.» style). «Reservar clase» stays the
enabled primary.

A **new tablet frame**, captioned **«Tablet · Plan activo»** with the
sub-caption «Cobro en efectivo deshabilitado mientras el plan siga vigente»,
placed right after «Tablet · Panel derecho con clienta seleccionada». It
copies that frame exactly (left panel, Paola Suárez's header, the history
card) and draws her Plan as active: the «Plan actual» card reads «Paquete de 8
clases» with the **«Activa»** pill (`rgba(124,148,115,0.16)` / `#5F7457`),
«Clases disponibles» «5 de 8», the 6px progress bar (`rgba(216,201,187,0.5)`
track, `#B78380` fill at 62%), and the calendar line «Pagado hasta el 31 de
agosto de 2026» in `#6E6663` with the `#B78380` icon; the actions column
becomes «Reservar clase» as the enabled primary (54px, `#B78380`, white), then
«Registrar pago en efectivo» disabled as above, then the note «Podrá comprar
otro plan cuando este termine.». The existing tablet frame (Vencida, cash
enabled) does not change: an expired Plan is exactly when cash is the way.
Every pending-invitation and self-registered frame («Sin plan activo») keeps
the enabled cash action.

Add to the notes card: «**Plan vigente** · Con plan activo o por vencer,
«Registrar pago en efectivo» queda deshabilitado con la nota «Podrá comprar
otro plan cuando este termine.»: no se vende un segundo plan mientras el
actual siga vigente (regla de 12, UX-003).»

## 4. README

- The `S06` row gains «; while her Plan is active «Registrar pago en
  efectivo» is disabled with «Podrá comprar otro plan cuando este termine.»
  (UX-003)».
- The `S07` row becomes «Front desk (on behalf of a client); the Session she
  already holds a Booking in carries the neutral «Ya reservada» pill instead
  of the seat count (UX-003)».
- The `S08` row becomes «Front desk; a Session she already booked shows «La
  clienta ya tiene esta clase reservada.» in place of «Reservar» (UX-003)».
- Under «Seat pills», after the `S08` capacity-summary bullet, a new bullet:
  «`S07` marks the Session the Client already holds a Booking in with «Ya
  reservada» on the full-class tones (`rgba(216,201,187,0.34)` / `#6E6663`),
  and `S08` then draws the note «La clienta ya tiene esta clase reservada.»
  instead of «Reservar»; a Waitlist entry keeps the count (UX-003).»

## What must remain untouched

Every other frame of `S06` (the thirteen «Sin plan activo» phone frames, the
expired tablet frame, and «Tablet · Se registró sola»), `S07`'s Android frame
and its day and chip logic, `S08`'s three existing phone frames and the tablet
frame, the `support.js` runtime and the device frames, the rest of the README
(the checklist's `S06→S21` and `S06→S22` entry points stay), and the seat-pill
tones already settled by follow-up 84.
