# Follow-up — the branded loading state

Targets: **Sistema de Diseño (Prompt 00)** (one new section, «08 · Carga»,
after «07 · Fundamentos» and before «Reglas de escritura»); **generated
handoff `design/README.md`** (one new «Loading state (Client and Staff)»
subsection under «Design tokens», and the «Assets» list); **one new asset,
`emma-logo.png`**, the studio's logo. No numbered screen changes: loading is
the moment before a screen's content arrives, and every screen keeps the
layout it already draws. Send [30](./30-invariants-checklist.md) alongside
this follow-up.

---

Written by MOB-061 on 2026-10-16. On the first Play Internal testing builds
the user saw about 38 Client and Staff screens (Inicio, Reservar, Mis
reservas, the plans, the payments, Perfil, Notificaciones, the Evaluations,
and the Staff screens) show the plain grey text «Cargando…» while their data
loads. On a phone network that text sits on screen for a second or more and
reads as unfinished. The user asked for a loading state that uses the
studio's logo.

## 1. The logo

The asset is `emma-logo.png`: the studio's lockup (the script «Emma», «PILATES
STUDIO» in Palo de rosa capitals, and the reclining figure over the Rosa
empolvado circle), on a **transparent** background, 800 × 333 px. It is the
user's artwork with its cream background removed, so it sits on Marfil
`#FAF7F2` without a visible box. Draw it as given: no recolouring, no crop,
no added outline or shadow.

## 2. The state

While a screen's data loads for the first time, the screen's content area
shows **only the logo**:

- **Placement:** centred, horizontally and vertically, in the content area
  between the screen's header and the tab bar (or the bottom edge where there
  is no tab bar), on the screen's own Marfil background. The header, the back
  arrow, and the tab bar stay drawn and usable.
- **Size:** 192 px wide on phones (80 px tall) and 240 px on tablets
  (100 px), whatever the screen.
- **No text, no card, no spinner** beside it. The plain «Cargando…» text is
  gone.
- **Delay:** nothing appears for the first **400 ms**, so a fast answer never
  flashes the logo. After that the logo fades in over 300 ms (ease-out).
- **Breathing:** then it breathes, endlessly and calmly: one breath is
  **2.8 s** (1.4 s in, 1.4 s out, ease-in-out). It goes from opacity 0.55 and
  scale 0.96 at rest to opacity 1 and scale 1.00 at the top of the breath,
  and back. Nothing else moves.
- **When the content arrives,** it replaces the logo with no exit animation.
- **Reduce Motion:** no fade and no breathing. After the same 400 ms the
  logo appears still, at opacity 1 and scale 1.
- **Screen readers:** the state is one element announced with the screen's
  existing Spanish label («Cargando clases», «Cargando tus reservas», …) as
  progress. The logo image itself is not read.

This state applies only to a whole screen's first load. **Not** here: busy
buttons (follow-up 93's spinner), pull-to-refresh (the platform's own
indicator), the Promotions carousel's placeholder card on Inicio, image
placeholders, and error states, which all keep what they draw today.

## 3. Sistema de Diseño — new section «08 · Carga»

Use the same section header pattern as the others: the number «08», the
title «Carga», and the line «Mientras una pantalla carga por primera vez,
solo el logo, respirando con calma. Sin texto ni spinner.» Then one white
card (1 px Arena cálida border, radius 16) that holds:

- **A phone content area,** 360 × 480 px, Marfil, radius 12, with a
  thin header strip at the top (the title «Mis reservas» in the heading
  serif, 56 px tall, an Arena cálida rule under it). The logo is 192 px wide
  and centred in the remaining space. This sample **breathes** as §2
  describes (a CSS animation, so the file shows the real motion), captioned
  «En pantalla · 192 px en teléfono, 240 px en tableta, centrado en el
  contenido».
- **Four still samples** in a row, each the logo at 120 px wide on a Marfil
  tile (160 × 110 px, radius 12) with a caption under it:
  1. an empty tile, «0–400 ms · nada todavía»;
  2. the logo at opacity 0.55 and scale 0.96, «En reposo · opacidad 0,55»;
  3. the logo at opacity 1 and scale 1, «Inhala · opacidad 1, 1,4 s»;
  4. the logo at opacity 1 and scale 1 with a small caption badge «Reducir
     movimiento», «Reducir movimiento · quieto, sin respirar».
- **One line of specs** under the samples, in the caption style: «Aparece a
  los 400 ms con un fundido de 300 ms. Una respiración dura 2,8 s
  (ease-in-out). El lector de pantalla anuncia la etiqueta de la pantalla,
  como «Cargando clases».»

## 4. README

Under «Design tokens», after «Row chevrons (Client and Staff)», add:

> ### Loading state (Client and Staff)
>
> - A screen's first load shows only `emma-logo.png` (transparent, 800 ×
>   333), centred in the content area between the header and the tab bar on
>   Marfil: 192px wide on phones, 240px on tablets. No text, card, or
>   spinner; the header and tab bar stay usable.
> - Nothing for the first 400ms, then a 300ms ease-out fade-in, then an
>   endless breath of 2.8s (1.4s in, 1.4s out, ease-in-out) between opacity
>   0.55 / scale 0.96 and opacity 1 / scale 1. Content replaces it with no
>   exit animation.
> - Reduce Motion: no fade and no breath; the still logo appears after the
>   same 400ms.
> - Announced as progress with the screen's Spanish label («Cargando
>   clases»); the image itself is not read.
> - Not for busy buttons, pull-to-refresh, the Promotions placeholder card,
>   image placeholders, or errors.

In «Assets», replace the «Images: none shipped.» sentence's start so the
bullet begins «**Images**: one shipped, `emma-logo.png` (the studio's logo,
transparent, used by the loading state); the rest are placeholders.» and
keep the rest of that bullet as it is.

## What must remain untouched

Every numbered screen; sections 01–07 of the design system and «Reglas de
escritura»; every other README section and bullet; the `support.js` runtime
and the device frames.
