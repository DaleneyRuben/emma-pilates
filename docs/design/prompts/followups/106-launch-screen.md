# Follow-up — the launch screen («Pantalla de inicio»)

Targets: **Sistema de Diseño (Prompt 00)** (one new card, «Pantalla de
inicio», inside the existing section «08 · Carga», after the loading-state
card); **generated handoff `design/README.md`** (one new «Launch screen
(Client and Staff)» subsection under «Design tokens», after «Loading state
(Client and Staff)»). No new asset: the logo is the existing
`emma-logo.png`. No numbered screen changes. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by MOB-068 on 2026-10-21. Neither app has a launch screen: a cold
start shows a plain white screen until the JavaScript loads, and only then
the Login screen or the saved session's first screen. The user asked for a
launch screen before the next store builds. The platforms draw it, not the
app (iOS from a storyboard, Android from the launch theme), so it is a still
image on a flat colour, and it is held until the app's first screen is ready
so the white gap never shows.

## 1. The screen

- **Background:** the whole screen in **`#F3E9E7`**, the blush tone at the
  edge of the app icons (their Android adaptive background), not Marfil:
  the launch continues the icon the person just tapped. Light mode only;
  there is no dark variant (both apps run in light mode).
- **The logo:** `emma-logo.png` (transparent, 800 × 333), drawn as given,
  centred horizontally and vertically.
- **Size on iOS:** **240 pt wide** (100 pt tall) on phones and tablets alike,
  the same width as the loading state on phones. On the iPhone 16 Pro
  (393 pt) that is 61% of the width; on the iPad Pro 11 (834 pt), 29%.
- **Size on Android:** **160 dp wide** (67 dp tall). Android 12 and newer
  draw the launch themselves, with the logo inside the system's 192 dp icon
  circle (invisible here, because its background is the same `#F3E9E7`);
  160 dp is the widest the logo's corners fit inside that circle, so nothing
  is clipped. Older Android draws the same 160 dp logo centred on the same
  background, without the circle. On a 411 dp phone that is 39% of the width.
- **Nothing else:** no text, no spinner, no studio name, no progress.
- **Duration:** from the tap on the icon until the first screen is ready
  (Login, or the saved session's first screen once the session check has
  answered), then a **300 ms fade** into that screen. A fast start can show
  it for well under a second; it never flashes, because the platforms draw
  it before any code runs.
- **Hand-over:** the first screen appears under the fade with its own
  layout; when that screen then loads data, the loading state of section
  «08 · Carga» takes over in its content area (so on a phone the logo goes
  from the screen's centre at 240 pt to the content area at 240 pt).

## 2. Sistema de Diseño — the card

Inside «08 · Carga», after the existing white card, a second white card
(1 px Arena cálida border, radius 16, padding 40) with:

- the eyebrow «Pantalla de inicio» in the same 12 px uppercase 0.16em style
  as «Momentos»;
- two still phone tiles side by side (gap 40, wrapping), each a rounded
  rectangle (radius 24) filled `#F3E9E7` with the logo centred:
  1. **«iOS · 240 pt»**: 270 × 584 px (the iPhone 16 Pro at 0.687), the
     logo **165 px** wide (240 × 0.687);
  2. **«Android 12+ · 160 dp»**: 270 × 600 px (a 411 × 914 dp phone at
     0.657), the logo **105 px** wide (160 × 0.657);
  each with a caption under it in the 12 px `#766D69` caption style:
  «iOS · 240 pt en teléfono y tableta» and «Android 12+ · 160 dp dentro del
  círculo del sistema (invisible)»;
- one line of specs under the tiles, in the 13 px caption style: «Fondo
  #F3E9E7, el tono del ícono. Se mantiene hasta que la primera pantalla
  está lista (Iniciar sesión o la sesión guardada) y se funde en 300 ms.
  Solo modo claro. En Android anterior a 12, el mismo logo de 160 dp
  centrado, sin círculo.»

The section's intro line («Mientras una pantalla carga por primera vez, …»)
and the loading-state card stay exactly as they are.

## 3. README

Under «Design tokens», after «Loading state (Client and Staff)», add:

> ### Launch screen (Client and Staff)
>
> - From the tap on the icon until the first screen is ready (Login, or the
>   saved session's first screen), both apps show `emma-logo.png` centred on
>   `#F3E9E7`, the icons' blush edge tone; then a 300ms fade. Light mode
>   only, nothing else on the screen.
> - iOS draws the logo 240pt wide on phones and tablets. Android draws it
>   160dp wide: on Android 12+ inside the system's 192dp icon circle
>   (invisible on the same background), the widest that fits without
>   clipping; older Android centres the same 160dp logo without the circle.
> - A native screen: it changes only with a store build, never with an
>   over-the-air update.

## What must remain untouched

Every numbered screen; sections 01–07 of the design system, the existing
loading-state card of 08, and «Reglas de escritura»; every other README
section and bullet, including the «Assets» list; the `support.js` runtime
and the device frames.
