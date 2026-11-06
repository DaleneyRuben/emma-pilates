# Follow-up — Second walkthrough: «Revisa tu correo», the Staff app's short name, and the studio changing a staff email (proposals)

Targets: **C01c Revisa tu correo** (Client app v2); the **Staff app's name
under its icon** (iPhone and Android home screens); **P07 Estudio ›
Personal** with its member panel («Editar miembro», AW24) at 1440 and 420 px;
the two **emails** of a studio-asked email change and the **page that
confirms it** (Staff app and admin web). Proposals only, on a canvas of their
own, exported to `design/v2/propuestas-recorrido-2/`. Read with
[225](./225-visual-system-v2.md), [233](./233-admin-web-pages-on-v2.md),
[242](./242-staff-profile-photo-on-the-screens.md),
[245](./245-horario-on-proposal-a.md) and
[93](./93-busy-buttons.md). Send [30](./30-invariants-checklist.md) alongside
this follow-up. No exported screen is regenerated: the owner picks one
proposal per finding, and a later follow-up carries the chosen ones into
C01c and P07.

---

Written on 2026-11-05 for DES-012: the second walkthrough's findings n.º 18
and n.º 31 and backlog row FIX-039 (walkthrough n.º 8). Every board is a
clickable prototype (a dark «Prototipo» strip with one chip per state, and
the screen's own buttons switch states too). The brand is written «Emma
Pilates Studio», with no tagline.

## 1. n.º 18 · «Revisa tu correo» with less text

**Why.** The owner: «esta página tiene mucho texto, debemos hacerla más user
friendly». The app's screen after **Regístrate** has six blocks of text
(«Si el registro puede continuar, enviamos las instrucciones…», the address
with **Cambiar correo**, «Abre el enlace más reciente… El enlace no inicia
sesión por ti», «vence en 24 horas; el correo indica la fecha y hora
exactas», «Si en 7 días no verificas…», **Cancelar registro**). C01c drew a
shorter screen, but the app grew past it.

**Kept in all three.** The 72 px envelope on Rosa tinte, «Revisa tu
correo» (Lora 24), «Te enviamos un enlace a mariana@example.com», one line of
what to do, **Iniciar sesión** (primary) and **Reenviar correo** (secondary).
The answer stays the same whether or not the address could register
(ADR-0029): nothing on the screen depends on it. After a resend: «Te
enviamos otro correo. Usa el enlace más reciente.»; while the server asks to
wait: «Ya te enviamos uno hace poco · El enlace que tienes sigue sirviendo.
Podrás reenviarlo en 0:53.» and the button reads «Reenviar en 0:53», off.
**Cambiar correo** opens a short screen («Escribe el correo correcto y te
enviamos un enlace nuevo.», the field, **Enviar enlace**). **Cancelar
registro** asks first in a sheet («¿Cancelar tu registro?», «El enlace deja
de funcionar y el correo queda libre para registrarte de nuevo.», **Sí,
cancelar registro**, **Volver**). «El registro venció» stays as it is.

- **A · Lo esencial (recommended).** Under the two buttons, a quiet
  «¿Correo equivocado? Ver opciones» opens a sheet with **Cambiar correo**
  («Si lo escribiste mal»), **Cancelar registro** («Libera el correo para
  empezar de nuevo») and the deadlines in one line: «El enlace vence en 24
  horas. Si no lo abres en 7 días, borramos el registro.»
- **B · Tres pasos.** The address in a Crema card with **Cambiar** on its
  right; three numbered steps («Abre el correo de Emma Pilates Studio»,
  «Toca «Confirmar mi correo»», «Vuelve aquí e inicia sesión»); under the
  buttons «El enlace vence en 24 horas.» and **Cancelar registro** in the
  error colour.
- **C · Menú ⋯.** A top bar with ← (back to Iniciar sesión) and ⋯; the body
  is the envelope, the title and «Te enviamos un enlace a / mariana@… /
  Ábrelo y vuelve para iniciar sesión.». The ⋯ menu holds **Cambiar
  correo**, **Cancelar registro** and the deadlines line.

Boards: `R-A-Lo-esencial`, `R-B-Pasos`, `R-C-Menu` (iPhone, 390 × 844).

## 2. n.º 31 · The Staff app's name under its icon

**Why.** On the iPhone home screen «Emma Pilates Staff» is cut to
«EmmaPilates…». Only the short name under the icon changes (iOS
`CFBundleDisplayName`, the Android launcher label); the App Store, Google
Play and the permission prompts keep «Emma Pilates Staff», and the Client
app stays «Emma Pilates». **This is the one place the owner's rule «Emma
Pilates Studio, never Emma alone» cannot hold:** a home-screen label fits
about 12 characters, so every proposal shortens it; the store name keeps the
full brand.

- **A · Emma Equipo (recommended):** Spanish, as the studio calls it.
- **B · Emma Staff:** today's name without «Pilates».
- **C · Equipo Emma:** starts differently from «Emma Pilates», so the two
  apps are told apart at a glance.

Board: `N-Nombre-bajo-el-icono` (today's cut name, then A, B and C, each on
an iPhone and an Android home screen next to the Client app's icon). The cut
is drawn with the system font and is approximate; the chosen name is checked
on the iPhone and Android when built.

## 3. FIX-039 · The studio changes an active staff member's email

**Why.** Walkthrough n.º 8, decided 2026-11-05: the Administrator edits
everything of the other staff, and an active account's email «sigue el flujo
de cambio de correo con confirmación». Today «Editar miembro» shows the
active login email read-only. The backend's email change (IDN-008) is
self-service only: its emails say «Pediste…», the audit names the account
itself, and only the Client app opens the `confirm-email-change` link.

**The rule, the same in A, B and C.**

- Only the **Administrator**, for another **active** staff member (FIX-038's
  reach; a pending invitation keeps its own «Cambiar correo»).
- On send, the new address gets a 24-hour link and the current address a
  notice. **The login email changes only when the link is opened**; until
  then the person keeps signing in with the current one and their sessions
  stay open (IDN-008 E2, E3).
- The panel shows the change waiting: «Esperando que Daniela confirme ·
  Enviamos un enlace a daniela.nueva@example.com. Hasta que lo abra, sigue
  entrando con daniela.ortiz@example.com. · El enlace vence el vie 6 de
  noviembre a las 15:40.» with **Reenviar enlace** and **Cancelar cambio**.
  A resend says «Enviamos otro enlace. Solo sirve el más reciente.»; the
  60-second limit shows the wait notice the panel already uses for
  invitations. Cancelling says «Cancelamos el cambio. Daniela sigue entrando
  con daniela.ortiz@example.com.»
- An address another account already uses is refused in place: «Este correo
  ya pertenece a otra cuenta.» (the studio sees it, as when inviting; the
  self-service neutrality of IDN-008 E8 does not apply to the
  Administrator).
- Personal shows the change waiting on that person's row.

**The proposals.**

- **A · Campo y confirmar al guardar (recommended).** «Correo electrónico»
  is an ordinary field. With a new address it says «Al guardar, le enviamos
  un enlace a este correo. Cambia cuando Daniela lo abra.»; **Guardar** opens
  a short dialog «¿Cambiar el correo de Daniela?» (what happens, and «También
  le avisamos a daniela.ortiz@…») with **Volver** and **Enviar enlace**. The
  waiting change is a Rosa tinte card under the field. Personal adds «Por
  confirmar: daniela.nueva@…» under the email.
- **B · Botón Cambiar al lado.** The email stays a read-only row with
  **Cambiar** beside it, which opens «Correo nuevo» in place (like a pending
  invitation's «Cambiar correo») with **Cancelar** and **Enviar enlace**; no
  dialog. The waiting change is the same card; Personal as in A.
- **C · Ventana aparte.** **Cambiar correo** beside the row opens a dialog
  with the field and three lines (the link to the new address, the notice to
  the current one, signing in with the current one until it is opened). The
  waiting change is a banner at the top of the panel, and Personal's Estado
  reads «Correo por confirmar».

Boards: `E-A-Campo-Web`, `E-B-Cambiar-Web`, `E-C-Ventana-Web` (1440) and
their `-420` twins.

**What the staff member receives (one board, the same for A, B and C):
`E-Lo-que-recibe`.**

- To the new address, «Confirma tu correo nuevo»: «El estudio cambió el
  correo con el que entras a la app del equipo de Emma Pilates Studio por
  este. Abre el enlace para confirmarlo.», **Confirmar mi correo nuevo**,
  «Este enlace vence en 24 horas. Hasta que lo confirmes, sigues entrando con
  tu correo anterior.», «Si no esperabas este cambio, habla con el estudio.»
- To the current address, no link, «El estudio está cambiando tu correo»:
  «El estudio pidió que entres a la app del equipo de Emma Pilates Studio con
  daniela.nueva@…. Nada cambia hasta que ese correo confirme el enlace que le
  enviamos.», «Si lo hablaste con el estudio, no tienes que hacer nada.»,
  «Si no lo esperabas, habla con el estudio: pueden cancelar el cambio.»
- The link opens the **Staff app** (new: today it has no page for it):
  «Correo confirmado · Desde ahora entras con daniela.nueva@…. Tu contraseña
  no cambió.»; «El enlace ya no sirve» when it expired, was replaced or
  cancelled; «No pudimos cambiar el correo» when the address was taken in the
  meantime (IDN-008 E10). On a computer the same link completes on the
  **admin web** (on 237's sign-in layout with the logo panel), as Crear
  contraseña already does.

## What must remain untouched

Every other C01 state, C20–C21, the admin web's other panels and pages, and
the Client app's own email change (C22). No exported screen under
`design/v2/cliente/`, `design/v2/equipo/` or `design/v2/admin/` changes in
this follow-up.
