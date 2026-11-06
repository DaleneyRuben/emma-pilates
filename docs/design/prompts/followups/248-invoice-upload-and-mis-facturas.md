# Follow-up — Upload the issued invoice and hand it to the Client (Mis facturas)

Targets: a new proposal canvas `design/v2/propuestas-factura/` with the
boards **E1–E5** (staff app), **W1–W2** (admin web, Dinero › Pagos at 1440
and 420 px) and **K1–K3** (client app on iPhone and Android), plus its
`Main.dc.html` index. Read with [225](./225-visual-system-v2.md),
[233](./233-admin-web-pages-on-v2.md), [93](./93-busy-buttons.md) and
[147](./147-pagos-invoice-issued.md) §3. Send
[30](./30-invariants-checklist.md) alongside. No exported screen under
`design/v2/cliente/`, `equipo/` or `admin/` is regenerated: once the owner
approves, a later follow-up carries the boards onto S11, S12, P06 and C18.

---

Written on 2026-11-05 for DES-011 (second walkthrough, 2026-11-04, Paso 7,
findings n.º 24 and 25). Mariana Quiroga paid her **Paquete de 8 clases**
(**Bs 502**) by transfer and asked for an invoice with NIT **123456** in her
own name. The owner found no way to give it to her: the system keeps the NIT
or CI, the name and a «Factura emitida» mark that only the Administrator sets
from the web, and the Client never receives the invoice. The staff app's
**Revisar pago** does not even show whether she asked for one.

## The owner's decisions (2026-11-05)

- Still no SIAT: the invoice is issued in the studio's usual billing system.
- The **Administrator, the Coordinator and the Assistant** upload the issued
  invoice (a PDF or a photo) on a payment, from the admin web and from the
  staff app. Uploading it marks the payment «Factura emitida», with who and
  when.
- The Client sees and downloads her invoices in **Mis facturas** in her app.
- **Revisar pago** in the staff app shows whether she asked for an invoice
  and in whose name.

## Rules the boards follow (decided for the proposal; the owner may object)

- An invoice is uploaded only on a **confirmed** payment that carries
  invoice data (NIT or CI and name). A payment «Por revisar» shows the data
  and the line «Podrás subir la factura cuando confirmes el pago.» A payment
  «Sin factura» shows «Sin factura · no la pidió» and offers no upload.
- Accepted files: **PDF, JPG or PNG, up to 10 MB** (the receipt limit).
- One current invoice per payment. **Reemplazar** uploads a new file; the
  old one is kept hidden, not deleted. **Quitar factura** asks first, hides
  the file from the Client and returns the payment to «Por emitir». Both are
  recorded with who and when, and the admin web lists that history in the
  panel.
- The plain **Marcar emitida** button goes away: the only way to mark a
  payment issued is to upload the invoice, so the Client always gets the
  file. Old marks without a file read «Emitida · sin archivo» and keep
  **Subir factura**.
- When the invoice is uploaded, the Client gets the notification «Tu factura
  está lista» · «La factura de tu Paquete de 8 clases ya está en Mis
  facturas.»; tapping it opens that invoice.

## Staff app (390 × 844, iPhone)

Each staff board has a dark **Prototipo** strip above the phone
(`#4A4A4A`, chips as on 237's boards) that switches its states; the
screen's own buttons link the flow.

- **E1 · Revisar pago** (S12 with Mariana's payment): the hero «Bs 502»,
  «Mariana Quiroga · Paquete de 8 clases». The Lino card gains a third row
  after «Enviado»: a 36 px Rosa tinte disc with a receipt icon, «Factura» on
  the left, and on the right «NIT 123456» over «Mariana Quiroga» (13 px
  Tenue), then a «Por emitir» pill under the card's rows with the line
  «Podrás subir la factura cuando confirmes el pago.» State **Sin factura**:
  the row reads «Sin factura» with «No la pidió» on the right and no pill.
  **Confirmar pago** goes to E2.
- **E2 · Pagos** (S11 for the Administrator, after confirming): the toast
  «Pago confirmado · Ya puedes subir la factura de Mariana» and, first in
  **Accesos**, the row «Facturas por subir» with «1» on the right → E4.
- **E3 · Clientes** (S04 for the Assistant and the Coordinator, who have no
  Pagos tab): above the search results a Lino row «Facturas por subir · 1»
  with the receipt disc and a chevron → E4. A chip switches the eyebrow
  between «Recepción · Achumani» and «Coordinación».
- **E4 · Facturas**: title «Facturas», a two-part segment «Por subir · 1 |
  Subidas». Por subir lists each confirmed payment with invoice data and no
  file: avatar, «Mariana Quiroga», «NIT 123456 · Paquete de 8 clases», «Bs
  502» on the right → E5. Subidas lists «Lucía Fernández · Subida por Ana ·
  4 nov». Empty state: 72 px disc, «No hay facturas por subir», «Cuando una
  clienta pida factura y confirmes su pago, aparece aquí.»
- **E5 · Factura del pago**, states:
  1. **Por emitir**: the hero (Rosa profundo) «Bs 502», «Mariana Quiroga ·
     Paquete de 8 clases», pill «Confirmado · 5 nov»; a card «Datos de la
     factura» with «NIT o CI · 123456» and «A nombre de · Mariana Quiroga»;
     a dashed Arena box «Sube la factura emitida» · «PDF o foto, hasta
     10 MB»; the primary **Subir factura**; the note «Al subirla, el pago
     queda como factura emitida y Mariana la ve en su app.»
  2. **Elegir archivo**: an action sheet «Tomar foto», «Elegir de la
     galería», «Elegir un PDF», «Cancelar».
  3. **Subiendo**: the file row («factura-000123.pdf · 248 KB») with a Palo
     de rosa progress bar at 60 %, the busy primary of 93.
  4. **No se pudo subir**: the file row on `#F7E5E0` and the v2 warning row
     «No pudimos subir la factura. Revisa tu conexión e inténtalo de
     nuevo.»; primary **Reintentar**, text button «Elegir otro archivo».
  5. **Archivo no válido**: the warning «Este archivo no sirve. Sube un PDF,
     JPG o PNG de hasta 10 MB.» and **Subir factura** again.
  6. **Emitida**: the hero pill «Factura emitida»; a file card (a 56 × 72
     page thumbnail, «factura-000123.pdf», «Subida por Ana Gutiérrez · hoy,
     10:42»), secondary **Ver factura**, text buttons «Reemplazar» and
     «Quitar factura» (Error `#A04E3E`); the toast «Factura subida · Mariana
     ya puede verla».
  7. **Quitar**: a bottom sheet «¿Quitar la factura?» · «Mariana dejará de
     verla en Mis facturas y el pago vuelve a quedar por emitir. Queda
     registrado quién la quitó.» with **Quitar factura** (Error fill) and
     **Cancelar**.

## Admin web, Dinero › Pagos (W1 at 1440, W2 at 420)

P06's Pagos tab with Mariana's rows; a **Prototipo** strip on top.

- **The table's Factura column**: invoice data as two lines (NIT tabular,
  name Tenue, truncated at 220 px) and under it the state: pill «Por emitir»
  plus the link **Subir factura**; pill «Emitida» with «por Carolina ·
  28/10»; «Sin factura» in Tenue; on a payment «Por revisar», only the data.
  The filter chip «Sin factura emitida» becomes «Factura por subir · 1».
- **The panel** (500 px; full screen at 420) opens on the row. For a
  confirmed payment it shows the payment kv card, then the eyebrow
  «Factura», the data card (NIT o CI, A nombre de, Estado pill), and:
  - **Por emitir**: a dropzone «Arrastra aquí la factura o elige un
    archivo» · «PDF, JPG o PNG, hasta 10 MB» with **Elegir archivo**;
  - **Subiendo**: the file row with the progress bar;
  - **No se pudo subir** / **Archivo no válido**: E5's warnings, with
    **Reintentar** and **Elegir otro archivo**;
  - **Emitida**: the file card, **Ver**, **Descargar**, «Reemplazar», and
    «Quitar factura» in Error; under it «Historial» lines («Subida por Paola
    Mendoza · 5 nov, 10:42»);
  - **Quitar**: E5's confirmation as a centred dialog;
  - **Por revisar**: P06's review panel with the invoice data card and «Podrás
    subir la factura cuando confirmes el pago.» above the actions;
  - **Sin factura**: the data card reads «Sin factura · la clienta no la
    pidió al pagar.» and nothing else.
- At 420 the table becomes cards (name, amount, state pill, invoice line)
  and the panel covers the screen with a back arrow.

## Client app, Mis facturas (K1 on iPhone; K2 iPhone 390 × 844; K3 Android 412 × 915)

- **K1 · Perfil** (C18 with Mariana): a row **Mis facturas** after «Mis
  evaluaciones», receipt icon, «1 nueva» in Tenue → K2.
- **K2 / K3 · Mis facturas**, states:
  1. **Vacía**: the C15b layout, 72 px disc with the receipt icon, «Aún no
     tienes facturas», «Cuando pidas factura al pagar, el estudio la sube
     aquí y te avisamos.» No button.
  2. **Lista**: rows in a Lino card: receipt disc, «Paquete de 8 clases»,
     «5 nov 2026 · Bs 502», and on the right the pill «Lista» (Éxito) or
     «En preparación» (neutral) for an invoice she asked for that is not yet
     uploaded. A «Nueva» Rosa tinte pill marks the one she has not opened.
     Under the card: «Las facturas salen a nombre del NIT o CI que diste al
     pagar. Si un dato está mal, avísale al estudio.»
  3. **Abierta**: a page preview (A4 ratio, the file's first page or the
     photo), a kv card («Paquete de 8 clases · Bs 502», «NIT o CI 123456», «A
     nombre de Mariana Quiroga», «Emitida 5 nov 2026») and the primary
     **Descargar**.
  4. **En preparación** (opened): no preview; the disc with an hourglass,
     «El estudio está preparando tu factura», «Te avisamos cuando esté
     lista.»
  5. **Descargando**: the busy primary.
  6. **No se pudo descargar**: the warning «No pudimos descargar la factura.
     Inténtalo de nuevo.» and **Descargar** again.
  7. **Listo**: on iPhone, the system share sheet («Guardar en Archivos»,
     WhatsApp, Mail); on Android, the snackbar «Guardada en Descargas» with
     «Abrir».
  8. **Aviso**: the push banner «Emma Pilates Studio · Tu factura está lista
     · La factura de tu Paquete de 8 clases ya está en Mis facturas.» over
     the list.
- Android differs only in the system parts: the status bar, the top app
  bar's arrow, the 48 px gesture bar, the snackbar instead of the share
  sheet.

## Canvas

`Main.dc.html` (1440) first: what changes, the rules above, the open
questions, and a card per board linking to it. The boards follow in three
rows (staff, web, client), each interactive, titled «E1 Revisar pago», and
so on.

## Leave untouched

Every exported board under `design/v2/cliente/`, `equipo/` and `admin/`,
the design system and `design/README.md`. The brand is «Emma Pilates
Studio»; no tagline.
