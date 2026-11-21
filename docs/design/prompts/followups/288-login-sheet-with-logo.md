# Follow-up — Login in both apps: the logo on the band, the form in a sheet at the bottom

Targets: **C01 Iniciar sesión** (client app,
`design/v3/cliente/C01-iniciar-sesion.dc.html`) and **E-A01 Iniciar sesión**
(staff app, `design/v3/equipo/E-A01.dc.html`), as proposals on a canvas of
their own, exported to `design/v2/propuestas-login/`. Read with
[227](./227-client-app-on-v2.md), [285](./285-rosa-emma-type-scale.md)
and [286](./286-rosa-emma-breathing-logo.md). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written on 2026-11-21. The owner looked at Login on a device during the Google
Play closed test and asked for two changes:

- **The screen looks top-heavy.** The band and the white card sit at the top,
  and the lower half of the screen is empty Rosa 100.
- **The email example goes.** «Ej.: tu@correo.com» (client) and «Ej.:
  tu@emmapilates.bo» (staff) under «Correo electrónico» are removed from Login.
  Recovery (20, S18) keeps its example.

She rejected two first tweaks of the current layout (a taller band, and the
card centred under it) and asked for a layout the way a professional would do
it.

## What every option keeps

- Every element that is there today: «Acceso del equipo» on staff, the two
  fields, «Iniciar sesión», «¿Olvidaste tu contraseña?», and on the client app
  «¿No tienes una cuenta? Regístrate». The Face ID button, the error, the wait
  notice and the closed-Account notice (C01f, C01e, C01t, C01n) keep their
  places in the form.
- Nothing ever scrolls under a pinned panel: with the keyboard up, the screen
  scrolls as one column.
- «Emma Pilates Studio» is said in full (227). The logo counts as the name and
  is read out as «Emma Pilates Studio».

## The options

- **A · Hoja abajo con el logo (recommended)**: the Rosa 200 band fills the
  screen down to the form, with the studio's logo (286's file, 70 % of the
  width, at most 380 pt) and staff's capsule centred in it. The form sits in a
  white `#FFFBFB` sheet anchored to the bottom edge, with 28 pt upper corners
  and 0 -12 32 rgba(147,97,93,.25) cast upward. The sheet takes the home
  indicator inset as padding. «Regístrate» closes the sheet under a 1 pt
  divider. On iPad the sheet is at most 560 pt wide and centred. This is the
  same logo-led entrance as the admin web's (DES-007 A).
- **B · Hoja abajo con el título**: A with Lora «Emma Pilates Studio» at
  30 pt in place of the logo.
- **C · Logo y tarjeta al centro**: no band. The logo, the white card and the
  «Regístrate» card are centred as one group on Rosa 100.

## Boards

Antes (C01 and E-A01 as they are today), then one row per option with
Clientas 390, Equipo 390 and Equipo on iPad 834. Tapping a field brings up
the keyboard and «Listo» closes it, so the owner can see each option with the
form raised.

## Decision

The owner chose **A** on 2026-11-21. The app's Login is built on A's boards
(`design/v2/propuestas-login/A-*.dc.html`). C01, its states and E-A01 stay as
they are under `design/v3/` until those screens are regenerated.
