# Follow-up — P10 Acceso redrawn with the logo panel

Targets: **P10 Acceso** (`design/v2/admin/P10-Acceso.dc.html`) and its entry
in the admin canvas index. The logo `emma-logo.png` goes next to it as a
support file. Read with [237](./237-admin-sign-in-proposals.md) and
[238](./238-admin-sign-in-proposals-corrections.md). Send
[30](./30-invariants-checklist.md) alongside. No other board changes.

---

Written on 2026-11-05 for DES-007. The owner chose proposal **A · Panel con
el logo** (decisiones §19.21). This follow-up makes it the screen.

## The change

Replace P10's Rosa profundo panel and its «Emma» / «Pilates Studio»
wordmark with proposal A as drawn on `design/v2/propuestas-acceso/A1` and
`A2`, with 238's corrections:

- **Wide (900 px and up).** The left half is a Rosa tinte `#F2E4E1` panel
  filling the height, with the logo in full colour, 440 px wide, centred.
  The right half is Marfil with the form directly on it, max 400 px wide,
  centred vertically.
- **Narrow (under 900 px).** The panel becomes a 200 px band at the top
  with the logo 240 px wide, and the form follows on Marfil.
- **The three screens and every state** of 237 and 238: Iniciar sesión
  (empty, Sesión terminada, Cuenta activa, Contraseña actualizada, Datos
  incorrectos, Demasiados intentos, Entrando), Recupera tu contraseña
  (empty, Enviando, Demasiadas solicitudes, No se pudo enviar, Revisa tu
  correo), and Crea tu contraseña (Invitación, Desde recuperación, No
  coinciden, Lista para guardar, Guardando, No se pudo guardar, Enlace no
  válido). The same copy, notices, wait notice, warning rows and busy
  buttons.
- **The prototype strip** across the top, as on the proposals, switches
  between the states. «Iniciar sesión» in the empty state goes to `P01
  Inicio`, as P10 does today. «¿Olvidaste tu contraseña?», «Enviar enlace»,
  «Guardar contraseña» and «Volver a iniciar sesión» move between the
  screens.
- **P10 stays a page** (`expand: fill`), fluid, 1440 × 1000 on the canvas.

## Leave untouched

Every other admin board. Remove P10's old copy that 237 replaced: «Si el
correo está registrado, te llegará un enlace en unos minutos. El enlace dura
24 horas.», «Repite la contraseña», «Activar cuenta» and «Hola, Carolina.
Elige una contraseña para entrar a Emma Pilates Studio.». The product's copy
is the one in 237.
