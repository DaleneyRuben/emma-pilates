# Follow-up — `10`'s studio QR: drawn whole, enlarged, and saved

Targets: **Client `10`** (the QR card in both frames, and one new third
frame, «QR ampliado»); **generated handoff `design/README.md`** (the `10` row
of the Client screen inventory and one «Interactions & behavior» bullet). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by MOB-062 on 2026-10-15. Testing the first Play Internal testing
build, the user found three problems with the studio's transfer QR on `10`:

1. **It is cut off.** The app draws the uploaded QR inside a fixed square and
   fills it, so a bank QR that is not exactly square loses its edges, and a
   cropped QR may not scan.
2. **It is small.** On a phone held next to another phone, or on a screen
   with the brightness down, 190–220 px is hard to scan; there is no way to
   see it bigger.
3. **It cannot be saved.** A Client paying from the same phone cannot point
   that phone's camera at its own screen. Bolivian banking apps offer «QR
   desde galería» (pay a QR picked from the photo library), so the Client
   needs the QR as a photo.

[90](./90-payment-qr-only.md) made the QR the card's only content and said
not to add any line, label, or icon inside it. That rule was about transfer
instructions (beneficiary, bank, account) and still holds: nothing added here
is a transfer instruction. The two actions below are the only additions to
the card; 90 is otherwise unchanged.

## 1. The QR card (both existing frames)

- **The QR is drawn whole.** It keeps its own proportions inside a box at
  most 190 × 190: the longer side is 190 px and the other follows the
  image's aspect ratio, centred, never cropped or stretched. The placeholder
  stays the square sample it is today (it is square, so it looks the same).
- **The QR is tappable**: tapping it opens «QR ampliado» (§2). Screen
  readers hear «Código QR del estudio. Toca para ampliarlo.»
- **Two quiet actions** under the QR, 14 px below it, centred on one row
  with 24 px between them: «Ampliar» and «Guardar QR», each the tertiary
  text button of Client screens (Work Sans 14 weight 500, `#8A5D59`, hover
  `#7A4F4B`), each with a 44 px tall hit area and a 16 px line icon in the
  same colour before the label: four outward corners for «Ampliar», a down
  arrow into a tray for «Guardar QR» (the same family as the upload icon,
  1.3 stroke). No button fill, no border, no divider.

The card keeps Blanco `#FFFFFF`, the `#D8C9BB` 1 px border, 16 px radius,
22 px padding, and the soft shadow.

## 2. New frame — «QR ampliado»

A third iPhone frame after the two existing ones, captioned «QR ampliado» /
«Pantalla completa clara · Guardar QR». It opens over `10` from the QR or
«Ampliar», covers the whole screen including the tab bar, and is light, not
a dark photo viewer (a QR scans best dark on light):

- **Background** Superficie `#FAF7F2`, edge to edge.
- **Top row** (under the status bar, 16 px side padding): «QR del estudio»
  in Lora 19 weight 500 `#4A4A4A` on the left; on the right a 44 px round
  close button with a 22 px `✕` line icon in `#4A4A4A` (1.3 stroke), labelled
  «Cerrar» for screen readers. The device's back gesture closes it too.
- **The QR**, centred, on a Blanco card (1 px `#D8C9BB`, radius 16, 20 px
  padding, no shadow) as wide as the screen allows with 20 px margins, the
  QR drawn whole at its own proportions inside it (on a 402 px frame: a
  362 px card holding a 322 px QR). A pinch zooms it further.
- **One line** under the card, centred, Work Sans 14/22 `#766D69`, max 300 px:
  «Guárdalo para elegirlo desde la galería en tu app bancaria.»
- **«Guardar QR»**: the regular 52 px primary button (Palo de rosa
  `#B78380`, white label), full width with 20 px margins, pinned 24 px above
  the home indicator. It is the view's one solid button.

After «Guardar QR» (on `10` or here) the result shows where the action was:

- **Saved:** the transient Éxito-tinted notice strip of `05`/`15` (check
  glyph, Nota style) under the top row: «QR guardado en tus fotos.» It fades
  after a few seconds, like the others.
- **Refused or failed:** an Error `#94493A` line, Work Sans 13, centred under
  the button (on `10`, under the two actions): «No pudimos guardar el QR.
  Permite que Emma Pilates agregue fotos en Ajustes.» No retry button: the
  button stays.

Draw the frame with the QR placeholder at 322 × 322 and the saved notice
showing, so both are on the board.

## 3. README

- In the Client screen inventory, the `10` row's description becomes:
  «Payment — transfer to the studio QR + receipt upload (no cash); the QR is
  the only transfer instruction, drawn whole and tappable, with «Ampliar» and
  «Guardar QR» under it and a light full-screen «QR ampliado» view».
- In «Interactions & behavior», right after the Client bullet that begins
  «Booking and assessment confirmations are acknowledged on arrival» (the
  last Client bullet), add: «`10`'s QR is drawn whole
  at its own proportions (never cropped). Tapping it or «Ampliar» opens «QR
  ampliado», a light full-screen view closed by «Cerrar» or the back gesture.
  «Guardar QR» (on `10` and in the view) adds the image to the photo library,
  asking only for permission to add photos, so the Client can pick it with
  their bank app's «QR desde galería»; it confirms with «QR guardado en tus
  fotos.» or explains a refusal.»

## What must remain untouched

- The header, the «Monto exacto» block with `Bs {{ amount }}` and «Paquete
  de 8 clases», the instruction paragraph under the card, the dashed upload
  area and the attached-receipt row, «Enviar comprobante» and its note, and
  the tab bar in both existing frames.
- The card's surface, border, radius, padding, and shadow; no beneficiary,
  bank, or account line (follow-up 90).
- Every other screen, the design system, and every other README section.
