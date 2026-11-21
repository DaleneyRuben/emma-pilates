# Follow-up — Rosa Emma: the breathing logo on a soft halo

Targets: `design/v3/equipo/E-A12.dc.html` (the app's loading state, the
same in every Client and Staff screen) and `design/v3/admin/RW-marco-cargando.dc.html`
(the admin web while a page loads). Nothing else on either board changes:
the header band, the tab bar, the sidebar, the top bar, the page title and
the Clases / Nutrición tabs stay exactly as drawn.

---

Written on 2026-11-20. The Rosa Emma redesign ([284](./284-rosa-emma-redesign.md),
[285](./285-rosa-emma-type-scale.md)) left the breathing loading state of
[94](./94-branded-loading-state.md) and [107](./107-admin-loading-state.md)
behind, and drew it wrong on both boards:

- `E-A12` squashes the 1312 × 565 logo into a 120 × 120 white circle.
- `RW-marco-cargando` draws a spinner and «Cargando el horario…» in a white
  card. Follow-ups 94 and 107 still hold: a page's first load shows only the
  logo, with no text, card or spinner, and that is what the admin web does.

The owner compared three Rosa Emma treatments on 2026-11-20 (a soft halo,
a white card, a white disc with rings) and chose **A · the soft halo**.

## 1. The state

- **Background:** the screen's own Rosa 100 `#F9E7DF`. No card, no disc, no
  border, no shadow.
- **Halo:** a circle behind the logo, 1.25 × the logo's width across, filled
  with a radial gradient of Rosa 50 `#FEF6F2`: solid to 45 % of the radius,
  fading to transparent at 70 %. It has no edge.
- **Logo:** `emma-logo.png` as given (no recolouring, no crop, no outline),
  centred in the halo, at its own 1312 : 565 aspect. 240 px wide on phones,
  300 px on tablets; on the admin web 240 px below 1024 px and 300 px from
  1024 px up.
- **Placement:** unchanged from 94 and 107. In the apps it is centred in the
  content area between the header band and the tab bar. On the admin web it
  is centred in the main area under the page header, and on the first load
  it is centred in the whole Rosa 100 viewport.
- **Motion:** unchanged. Nothing for 400 ms (the web's first load shows at
  once), a 300 ms fade, then one breath every 2.8 s from opacity 0.55 and
  scale 0.96 to opacity 1 and scale 1. **The halo breathes with the logo**
  as one piece. Under Reduce Motion both stand still at opacity 1.
- **Screen readers:** unchanged. One element, announced as progress with the
  screen's Spanish label; the logo is not read.

## 2. The boards

- `E-A12`: replace the 120 px circle with the halo (300 px) and the logo
  (240 × 103) centred in the content area.
- `RW-marco-cargando`: replace the white card with the spinner and the text
  with the halo (375 px) and the logo (300 × 129), centred in the space under
  the Clases / Nutrición tabs.

Both boards must still pass `design/v3/sistema/revisor/revisar.cjs` with 0
problems (they lose text; they gain none).
