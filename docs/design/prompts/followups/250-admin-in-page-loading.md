# Follow-up — In-page reads on the admin web show the logo too

Targets: **generated handoff `design/README.md`** only (the «### Loading
states» subsection of «Admin web — shell» that follow-up
[107](./107-admin-loading-state.md) added). No numbered screen changes, no
new visual, and no change to the design system's section «08 · Carga». Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by WEB-045 on 2026-11-05. During the second walkthrough the owner
saw Horario › Clases show a Lino box with the text «Cargando el horario…»
while its classes loaded, and asked (2026-11-05): «todavía tenemos varias
páginas en las que mientras se está cargando algo no estamos mostrando el
logo de emma cargando … debemos corregir esto en toda la web». Follow-up
107 had kept those in-page notices as they were. From here on, read the
admin web's loading states this way:

## 1. In-page reads

When a page, a tab of a page, or a side panel waits for its first read (the
class week, a list, the client file and its tabs, a payment under review, a
report), the area it would draw shows **only the logo**, exactly as
follow-up 94's state: no Lino card, no text, no spinner. It is centred,
horizontally and vertically, in what that area has left under the page's
header and tabs (or under the side panel's header and tabs); the header, the
tabs, the filters and the actions above it stay drawn and usable. Nothing
appears for the first **400 ms**, then the 300 ms fade-in and the 2.8 s
breath; still under Reduce Motion, after the same 400 ms. Size as the page
switch: 300 px wide at 1440 px, 240 px at 420 px.

- **One logo at a time.** When two areas of a page load at once (Informes ›
  Dinero reads the accrued revenue and the report), only the first shows the
  logo; the other draws nothing until the first has arrived.
- **Inicio** shows the logo under its greeting until it knows what waits;
  it never says «Todo al día» before that.
- **Screen readers:** one status named with the page's existing Spanish
  label («Cargando el horario…», «Cargando la ficha…»); the image is not
  read.

## 2. What keeps its own pattern

Small inline loads keep what they draw today: busy buttons (follow-up 93's
spinner), a field's own «Cargando sucursales…» placeholder in a select, a
summary card's own line on Inicio when it switches Hoy / Mes, the client
file's acquisition line, image placeholders, a table refreshed after its
first read (the rows stay on screen), and the «No pudimos cargar …» and
recovery states.

## 3. README — «Loading states»

In «### Loading states», replace the last bullet's sentence «Not for the
in-page «Cargando …» notices, busy buttons, or the recovery state.» with
«Not for busy buttons, a select's own placeholder, image placeholders, or the
recovery state.», and add after the «Page switch» bullet:

> - **In-page reads:** a page, a page's tab, or a side panel waiting for its
>   first read shows only the logo, centred in what is left under its header
>   and tabs, after 400ms, at the same sizes; one logo at a time when two
>   areas load together. Announced with the page's label («Cargando el
>   horario…»).

## What must remain untouched

Every numbered screen; section «08 · Carga» of the design system and its
two cards; the «First load» and «Page switch» bullets; every other README
section and bullet; the `support.js` runtime and the device frames.
