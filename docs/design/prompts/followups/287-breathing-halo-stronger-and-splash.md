# Follow-up — The breathing halo, stronger, and the launch splash to match

Targets: `design/v3/equipo/E-A12.dc.html` and
`design/v3/admin/RW-marco-cargando.dc.html` (the halo only), and the native
launch splash of both apps (`apps/client-mobile` and `apps/staff-mobile`
`app.json` and `assets/splash-logo.png`), which no board draws. Everything
else on both boards stays as [286](./286-rosa-emma-breathing-logo.md) left it.

---

Written on 2026-11-20. The owner saw 286 on the iPhone 16 Pro and read it as
the old screen. There were two reasons:

- The Rosa 50 halo on the Rosa 100 screen is too close in tone to see, and at
  rest the logo dropped to opacity 0.55, so it looked grey and washed out.
- What shows on a cold start is the native launch splash. It was still the
  palette-B splash: the bare logo on `#F3E9E7`.

From here on, read the following instead of 286 §1's halo and motion lines.

## 1. The halo

- A radial gradient of white `#FFFBFB`: solid to 52 % of the radius,
  60 % white at 60 %, gone at 70 %. A soft but visible edge on Rosa 100
  `#F9E7DF`.
- Same size as 286: 1.25 × the logo's width (300 pt for a 240 pt logo).

## 2. The breath

- Rest: opacity **0.8** (not 0.55), scale 0.96. Top: opacity 1, scale 1.
- Everything else in 286 holds: 400 ms of nothing, a 300 ms fade in, one breath
  every 2.8 s with the halo and the logo as one piece, still under Reduce
  Motion.

## 3. The launch splash

- Background: Rosa 100 `#F9E7DF`, the same as every screen, so the splash
  and the first screen read as one surface.
- Image: the halo of §1 with the logo on it, baked into one transparent
  `splash-logo.png` (900 × 900 px, the logo 80 % of its width), drawn at full
  opacity and still.
- iOS: 300 pt wide, the same halo and logo size as the phone loading state.
- Android: 192 dp. On Android 12 and later the system shows the splash
  icon inside a 192 dp circle, so the halo fills that circle (the logo is
  154 dp wide).

## 4. The boards

`E-A12` and `RW-marco-cargando` draw the halo of §1 at the top of the breath.
Both must still pass `design/v3/sistema/revisor/revisar.cjs` with 0 problems.
