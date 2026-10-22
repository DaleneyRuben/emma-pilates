# Follow-up — The loading states of the admin web («Cargando»)

Targets: **Sistema de Diseño (Prompt 00)** (one new card, «En la web de
administración», at the end of section «08 · Carga», after the mobile card
follow-up [94](./94-branded-loading-state.md) added); **generated handoff
`design/README.md`** (a «### Loading states» subsection in «Admin web —
shell», after «### Recovery state»). No numbered screen changes: loading is
the moment before a page's content arrives, and every admin screen keeps the
layout it already draws. Send [30](./30-invariants-checklist.md) alongside
this follow-up.

---

Written by WEB-035 on 2026-10-21. After MOB-068 gave both mobile apps a
launch splash screen, the user asked for the same care on the admin web,
which today shows a blank browser page from the first request until its code
and the session probe arrive, and nothing at all when a sidebar click lands
before that page's code has been downloaded (every page is its own chunk).
Follow-up 94 settled the branded loading state for the Client and Staff apps:
only the studio's logo, breathing calmly. The admin web reuses it as is; this
follow-up says where it sits on the web and adds the sample so the design
system shows the web beside the phone.

## 1. The two moments

- **First load** (the browser opens the admin web, before anything is known
  about the session): the whole viewport is Crema `#F2ECE5`, the page's own
  background, with **only the logo** centred in it, horizontally and
  vertically. No wordmark, no text, no spinner, no card. It is shown from the
  first paint, with no 400 ms delay: there is nothing else to show, and it
  plays the part the splash screen plays on the phones. It is replaced by
  the first page (Login, or the shell with its page) with no exit animation.
- **Page switch** (a sidebar entry whose page has not arrived yet): the
  sidebar, the top bar with the Branch selector and the account cell, and the
  «Saltar al contenido» link stay where they are; the main area, on its own
  Superficie `#FAF7F2`, shows **only the logo** centred in its content area
  between the top bar and the bottom edge, with no card, no title, no text.
  Nothing appears for the first **400 ms**, as on the phones, so a page that
  arrives at once never flashes it. When the page arrives it replaces the
  logo with no exit animation.

## 2. The logo and its motion

Everything else is follow-up 94's state, unchanged: the asset is
`emma-logo.png` (transparent, 800 × 333) drawn as given; **300 px wide**
(125 px tall) in the 1440 px shell and on the first load, **240 px** (100 px
tall) in the 420 px narrow variant and on a phone; a 300 ms ease-out fade-in
to the rest, then an endless breath of 2.8 s (1.4 s in, 1.4 s out,
ease-in-out) between opacity 0.55 / scale 0.96 and opacity 1 / scale 1.
Under Reduce Motion no fade and no breath: the still logo, opacity 1.

Screen readers: the state is one element announced as a status, «Cargando
la administración» on the first load and «Cargando la página» on a page
switch; the image itself is not read.

Not here: the in-page «Cargando …» notices a page shows while its own reads
run (the white card in Texto tenue), busy buttons, image placeholders, and
the recovery and error states, which all keep what they draw today.

## 3. Sistema de Diseño — the admin card in «08 · Carga»

After the existing white card of section 08, add a second white card (1 px
Arena cálida border, radius 16, 40 px padding) titled with the caption-style
label «EN LA WEB DE ADMINISTRACIÓN» (12 px, 0.16em, uppercase, `#7A716D`),
holding two samples side by side, each with a caption under it:

1. **First load:** a 480 × 300 px tile, Crema `#F2ECE5`, radius 12, 1 px
   `#EFE7DE` border, with the logo 180 px wide centred in it (the tile is a
   third of the 1440 px reference, so the logo keeps its proportion). Caption:
   «Primera carga · solo el logo sobre Crema, desde el primer instante».
2. **Page switch:** a 480 × 300 px tile, radius 12, 1 px `#EFE7DE` border,
   `overflow:hidden`, drawing the shell at the same scale: a 78 px white
   sidebar strip on the left with a right border `#E4D8CC` holding the
   wordmark «Emma» (Lora 11) and six 4 px-tall `#F2EBE2` rounded lines for
   the entries; a 16 px white top bar with a bottom border `#E4D8CC`; and
   the main area in Superficie `#FAF7F2` with the logo 120 px wide centred
   in it. This sample **breathes** as follow-up 94's phone sample does (the
   same `emma-breath` animation). Caption: «Cambio de página · el logo en el
   área de contenido tras 400 ms; la barra lateral y la superior se quedan».

Under the two samples, one line in the caption style: «Mismo logo, mismo
ritmo que en las apps (§08). En la web, 300 px de ancho a 1440 px y 240 px
a 420 px.»

## 4. README — «Loading states»

After «### Recovery state» in «Admin web — shell», add:

> ### Loading states
>
> - **First load:** from the first paint until the session probe answers,
>   the viewport is Crema `#F2ECE5` with only `emma-logo.png` centred in it
>   (300px wide, 240px on a phone), with no delay: it is the web's splash
>   screen. The first page replaces it with no exit animation.
> - **Page switch:** when a sidebar entry's page has not arrived after
>   400ms, the main area shows only the logo centred in its content area on
>   Superficie `#FAF7F2` (300px wide at 1440px, 240px at 420px); the
>   sidebar, the top bar, and the skip link stay. The page replaces it with
>   no exit animation.
> - Motion and Reduce Motion as the mobile loading state above (300ms
>   fade-in, a 2.8s breath between opacity 0.55 / scale 0.96 and 1 / 1;
>   still under Reduce Motion). Announced as a status: «Cargando la
>   administración» and «Cargando la página». Not for the in-page
>   «Cargando …» notices, busy buttons, or the recovery state.

## What must remain untouched

Every numbered screen; the mobile card of section 08 and sections 01–07 and
«Reglas de escritura»; the «No pudimos cargar …» card, the recovery state,
and the startup page; every other README section and bullet; the
`support.js` runtime and the device frames.
