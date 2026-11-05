# Follow-up — The admin web's sign-in screens: proposals

Targets: **P10 Acceso** (admin web v2: Iniciar sesión, Recupera tu contraseña,
Crea tu contraseña), and through it **AW01**, **AW30** and **AW32**, as
proposals only, on a canvas of their own. Read with
[225](./225-visual-system-v2.md), [233](./233-admin-web-pages-on-v2.md) and
[93](./93-busy-buttons.md). Send [30](./30-invariants-checklist.md) alongside
this follow-up. No exported screen is regenerated: the owner picks one
proposal, and a later follow-up redraws P10 with it.

---

Written on 2026-11-05 for DES-007 (second walkthrough, 2026-11-04, Paso 3
n.º 7).

## Why

- **The owner says the sign-in «se pierde con el fondo».** What the admin
  web shows today (the AW01 build, `apps/admin-web/src/auth/auth-layout.tsx`)
  is a 420 px Lino card on an Arena page, two colours so close that at
  2000 px the card barely shows; the rest of the window is an empty field of
  the same colour. The wordmark is «Emma» in Lora with «Pilates Studio» small
  under it.
- **P10 was drawn in 233** as a split page with a Rosa profundo panel, but it
  was never built, it writes the brand as «Emma» over «Pilates Studio», and
  its «Revisa tu correo» says the link lasts 24 hours where the product says
  30 minutes. The proposals below replace it.
- **The same frame serves three screens.** «¿Olvidaste tu contraseña?»
  (AW30) and «Crea tu contraseña» (AW32, opened from a staff invitation or a
  recovery email) use the same layout, so whatever the sign-in becomes, the
  other two follow, with the same notices, errors and busy button.
- **The studio has a real logo**, `design/emma-logo.png` (800 × 333,
  transparent: the «Emma» script in olive, «PILATES STUDIO» in rose, a
  Rosa tinte disc and a line drawing of a woman stretching). The admin web
  already ships it as `public/emma-logo.png`. Proposals may use it in full
  colour on a light surface; it does not read on Rosa profundo.

## The proposals

Three, each a clickable prototype at 1440 px and at 420 px:

- **A · Panel con el logo.** A split page. The left half is a Rosa tinte
  `#F2E4E1` panel filling the height, with the logo in full colour, about
  440 px wide, centred, and nothing else. The right half is Marfil with the
  form directly on it (no card), max 400 px wide, centred vertically. At
  420 px the panel becomes a 200 px band at the top with the logo about
  240 px wide, and the form follows on Marfil.
- **B · Bloque fuerte.** A split page like P10, corrected. The left 40 % is
  the page's one Rosa profundo `#93615D` block: «Emma Pilates Studio» set in
  Lora, white, 44 px, on one or two lines, nothing else (no tagline, no
  description). The right side is Marfil with the form directly on it. At
  420 px the block becomes a 160 px band at the top with the name in 28 px.
- **C · Tarjeta que se ve.** The current single card, made visible: the
  page is Rosa tinte `#F2E4E1`; the card is Marfil `#FAF7F2`, 440 px wide,
  radius 20, with a soft shadow `0 12px 40px rgba(74,58,48,.10)`; the logo
  in full colour, about 260 px wide, sits at the top of the card. At 420 px
  the card fills the width with 16 px margins and keeps the shadow.

In all three the brand is «Emma Pilates Studio» in full (in the logo or in
type), never «Emma» alone, and no tagline anywhere.

## What every proposal shows

The form is the same in the three:

- Title «Inicia sesión» (Lora 30), and under it «Para Administración y
  Coordinación.» in Tenue.
- «Correo electrónico» (placeholder `tu@correo.com`) and «Contraseña» with
  the eye control (follow-up 92), as v2 fields: Lino `#F5EFE9`, Arena
  `#E6DBD0` 1 px border, radius 12, 48 px high, label 13 px weight 500 above.
- **«Iniciar sesión»**, the primary button: Palo de rosa `#B78380`, white
  600 17 px, 52 px high, full width, radius 14. It is the only filled
  button.
- **«¿Olvidaste tu contraseña?»**, a text button in Rosa enlace `#7D4F4B`
  under it, centred, 44 px high, no underline.

A tweak «estado» on each board switches between these states, and each
board also links its own taps («¿Olvidaste tu contraseña?» opens the
recovery screen, «Volver a iniciar sesión» returns, «Enviar enlace» shows
«Revisa tu correo», «Guardar contraseña» returns to the sign-in with «Tu
cuenta está activa»):

1. **Iniciar sesión**, empty.
2. **Sesión terminada**: above the fields, a notice on Lino (on Marfil in C's
   card) with a 36 px Rosa tinte disc and a `schedule` icon in Palo de rosa:
   «Tu sesión terminó. Vuelve a iniciar sesión.» The same shape carries
   «Tu cuenta está activa. Inicia sesión con tu nueva contraseña.» and «Tu
   contraseña se actualizó. Inicia sesión con la nueva contraseña.» with a
   `task_alt` icon (a tweak value each).
3. **Datos incorrectos**: email and password typed; between the fields and
   the button, the v2 warning: Lino row, 36 px `#F7E5E0` disc with an Error
   `#A04E3E` `error` icon, «El correo o la contraseña no son correctos.»
   Fields keep their Arena border (the message is neutral, ADR-0029).
4. **Demasiados intentos**: the same place, the neutral wait notice AW30
   already uses (`schedule`/clock icon in Palo de rosa, Lino, Arena border,
   no Error colour): «Demasiados intentos. Intenta de nuevo en un momento.»
   and under it, tabular, «Podrás intentarlo en 0:42.» The button turns
   Deshabilitado (`#E7DCD8` fill, `#B3A9A5` label) until the countdown
   ends. This moves the throttled login off red text, so the
   sign-in and recovery pauses look the same.
5. **Entrando**: the busy button of 93: same fill and size, a 16 px white
   ring in place of the label, fields untouched.

**Recupera tu contraseña** (AW30) in the same frame: title «Recupera tu
contraseña», line «Te enviaremos un enlace para restablecer tu
contraseña.», «Correo electrónico», «Enviar enlace» (primary), «Volver a
iniciar sesión» (text button). States: empty; busy «Enviar enlace»;
«Demasiadas solicitudes» (the wait notice: «Demasiadas solicitudes. Intenta
de nuevo en un momento; si ya recibiste un enlace, sigue sirviendo.» and
«Podrás pedirlo en 0:58.»); «No pudimos enviar el enlace. Inténtalo de
nuevo en unos minutos.» as the warning row; and **Revisa tu correo**: a
72 px Rosa tinte disc with `mark_email_read`, «Revisa tu correo», «Si el
correo corresponde a una cuenta, te enviamos un enlace para restablecer tu
contraseña.», «El enlace vence en 30 minutos.» in Tenue, «Volver a iniciar
sesión».

**Crea tu contraseña** (AW32) in the same frame: for an invitation, «Crea
tu contraseña» and «Elegir tu contraseña activa tu cuenta y confirma tu
correo.»; for a recovery link (a tweak), «Crea una contraseña nueva» and
«Elige una contraseña nueva para tu cuenta.». Fields «Contraseña nueva»
and «Confirmar contraseña», both with the eye; «Guardar contraseña»
(primary); «Volver a iniciar sesión». States: empty (button in
Deshabilitado until both fields are valid); «Las contraseñas no coinciden.»
under the second field in Error 13 px with a 1.5 px Error border on it;
busy «Guardar contraseña»; «No pudimos guardar la contraseña. Inténtalo de
nuevo en unos minutos.» as the warning row; and **Enlace no válido**: the
72 px disc with `link_off`, «Este enlace ya no es válido», «Las invitaciones
vencen a los 7 días y sirven una sola vez. Pide a la administración del
estudio que te envíe una nueva.», and «Volver a iniciar sesión». This screen
has no throttled state today; do not invent one.

## The index board

A first board «Inicio de sesión de la web» with the three proposals as
cards: name, one line on how it works, a small drawing of the 1440 px page,
and links to its 1440 and 420 boards. Under the cards a comparison table
(how much the sign-in stands out, the logo, how it reads at 420 px, how
much of today's code changes) and «Recomendada» on A. Brand «Emma Pilates
Studio» in full, no tagline.

## Leave untouched

Every exported screen, P10 included. Only v2 tokens: Marfil page, Lino
fields, Rosa tinte for the panel or page, Rosa profundo at most once per
page (only B uses it), Palo de rosa for the one primary button, Rosa enlace
for text buttons, Error only for errors. Copy is the product's as quoted
above; no new copy except the titles «Inicia sesión» and «Recupera tu
contraseña».
