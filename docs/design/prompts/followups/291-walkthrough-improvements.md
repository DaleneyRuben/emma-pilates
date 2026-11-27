# Follow-up — Walkthrough improvements (owner's iPhone walkthrough, 2026-11-25/26)

Targets: Client `design/v3/cliente/` C01b, C01c, C01e, C01k, C02b–C02f, C04, C05, C10b, C10c, C11–C11c, C16, C18, C19, C22, C25 and new boards; Staff `design/v3/equipo/` E-D19, E-D20, E-F01–E-F03, E-F06, E-F07, E-F13, E-F14 and new boards; admin web `design/v3/admin/RW-clientas-ficha-*`; the Rosa Emma system (`design/v3/sistema/`).

Read with the walkthrough table `mejoras-recorrido.md` (rows #1–#27), the owner's approval log of 2026-11-26, ADR-0092 for staging, and the referral rule decided on 2026-11-26 (only a host with an active paid plan can give a free class).

---

Written and applied on 2026-11-26 on one Claude Design canvas, built on the Rosa Emma generator so every piece matches `design/v3`. The owner approved every board below; the boards are the reference, this file records the decisions behind them.

## One left margin (#8) — applies to every Client and Staff screen

The band (icon, title, back button), the section titles on the rosa 100 background, the cards and the footer with buttons all start 16 px from the screen edge. Text inside a card sits 16 px further in. Before, the band and the section titles used 20 px (24 px on the sign-in screens) while cards used 16 px. Every new or redrawn board below already follows it; `design/v3/sistema/SYS-un-solo-margen.dc.html` shows the rule. C01k now uses the same left-aligned status layout as C11.

## Registro y acceso

- **#3** C01k2 «No pudimos verificar tu enlace» («Revisa tu conexión e inténtalo de nuevo.», «Reintentar» + «Ir a iniciar sesión»), C01k3 «Enlace ya utilizado» («Si ya verificaste tu correo, puedes iniciar sesión.»). Copy as built in PR #389.
- **#4** C01e2: when the phone has a pending registration with that e-mail, «Todavía no confirmaste tu correo» with «Reenviar correo» replaces the generic error. C01c2: «Revisa tu correo» asks the server on open; if already verified it goes to sign-in with «Tu correo ya está confirmado. Inicia sesión para entrar.»
- **#5** The app never offers to save the password (like a bank app): the e-mail and password fields turn off autofill and saving (`textContentType` none / `autoComplete="off"`, `importantForAutofill="no"` on Android). After the first sign-in only «¿Entrar con Face ID?» appears (fingerprint on Android), C01q. Single exception, C01r: a phone that cannot use biometrics (no sensor or nothing enrolled) keeps autofill, the system offers to save (Google on Android, keychain on iOS) and no biometric offer is shown. Confirm on real devices. Same in Staff.
- **#6** C01b3/C01b4: with the keyboard open, «Crear cuenta» and «¿Ya tienes una cuenta?» are the end of the scrolling form, never pinned; the active field scrolls into view. Decision: the button is always at the end of the form, keyboard open or not. Same rule for sign-in, Editar perfil, Cambiar contraseña, Enviar comentarios and Staff.
- **#15** C25c/C25d: «Enviar comentario» is always active; a missing type shows «Elige el tipo de comentario» under the chips and scrolls there (no preselected type). Every form says what is missing instead of disabling its button.
- **#18** C01b5: a valid code selects «Recomendación de una amiga» by itself and shows «Código de Lucía ✓»; the example reads «Ej.: LUCIA». C01b6: an unknown code is flagged before the account is created.

## Pagos y subidas

- **#7** C10u: the receipt starts uploading as soon as it is chosen, with progress; «Enviar comprobante» waits for it.
- **#23** C10b/C10c: title «Comprobante listo» only, a visible «Cambiar», the X apart; the thumbnail opens C10v (full screen, «Cerrar» and «Cambiar comprobante»).
- **#14** C22c: the new profile photo shows at once and uploads behind (progress ring); «Guardar cambios» never waits. C22d: only a failure shows a notice with «Reintentar».
- **#9** C11n: after sending the receipt, if notifications were never allowed, the C04n sheet with «Te avisamos cuando aprobemos tu pago». Once only, same control as bookings.
- **#24, #25 (Staff)** E-D19: the whole dashed box opens the picker; before a file the footer button is «Elegir factura». E-D20: only «Elegir una imagen» and «Elegir un PDF» (no «Tomar foto»), opened after the sheet has closed. E-D27 (PDF) / E-D28 (image): the chosen file shows like #23 with «Cambiar» and X, then «Subir factura» confirms. Tapping the file opens E-D29 (PDF page by page, «Página 1 de 2») or E-D30 (image, pinch to zoom), both with «Cerrar» and «Cambiar», the same pattern as C10v.

## Notificaciones

- **#10** Delete one at a time: swipe left shows «Borrar», then a notice with «Deshacer» for a few seconds (C19, C19c, C19d; Staff E-F06, E-F15). There is no «Borrar todas»; «Marcar leídas» / «Marcar todo leído» stays. Notifications older than 30 days hide by themselves. Soft delete in the database.
- **#11 (Staff, administration)** New «Comentarios» screen reached from Perfil (E-F03 row with the unread count): tabs Nuevos / Revisados / Resueltos, one «Filtrar» button with a sheet for Tipo (Todos, Problema, Sugerencia, Otro) and App (Las dos, Clientas, Personal), and a single removable summary chip while a filter is on (E-F18, E-F25, E-F26). Detail E-F19: who, type, app and version, date, full text, Estado and the internal «Qué cambiamos» note, as on the web. The comment notification shows who and the start of the text and opens the comment (E-F20).
- **#12 (Staff)** E-F07: review notices are not grouped. «Por revisar» on top (dot, chevron, whose and how much: «Ana Pérez · Trimestral 36 clases · Bs 1.862»); «Ya revisados» below, dimmed, with ✓ and no chevron («Pago de Sofía Paredes aprobado por Gabriela · 13:20»).

## Referidos

- **#13** «Compartir tu código» opens the native system share sheet (iOS UIActivityViewController, Android Sharesheet) with text and link prefilled; no custom sheet, no WhatsApp shortcut (C16g, E-F22 draw the iOS sheet as an illustration). The link `links.emmapilatesstudio.com/client/invite/CODE`:
  - Android: no page; it goes straight to Google Play with the code in the install referrer and the app fills it in on first open (CW01b).
  - iPhone: a minimal page with the code and one button «Copiar código y abrir App Store» (CW01); after install the app offers «¿Te invitó Lucía?» / «Usa su código y tu primera clase es gratis.» / «Usar código LUCIA» (C01b8), which leads to C01b5.
  - Computer or other device: the code and two equal store buttons (CW01c).
  - With the app installed: «Crea tu cuenta» opens with the code filled in.
- **#20** C16/C16s: «Tus invitadas» shows the next step under each status («Si compra su primer plan, ganas una clase», «Ganaste 1 clase…»). «Cómo funciona» ends with «Puedes invitar a una amiga por mes.»
- **#22** Only a host with an active paid plan can give a free class. C16h: without one, «Se activa cuando compres un plan.» and «Comprar un plan» replace sharing; Inicio without a paid plan no longer offers «Invita a una amiga» (C02b, C02c, C02d). The friend whose host's code was inactive sees on Inicio «El código de Lucía todavía no está activo» / «Esta vez tu cuenta no incluye la clase gratis.» (C02j).
- **#19** C02f: «Te invitó Lucía» and «Reservar mi clase gratis». After booking, C05j: «Usaste tu clase gratis. ¡Te esperamos el sáb 28 a las 13:00!» instead of «Tu pase de invitada ya se usó.»
- **#26, #27 (Staff)** E-F13/E-F14/E-F21/E-F22: «Tu código de referido» follows the Client card: «TU CÓDIGO», the code large with copy, «Compartir tu código» (native sheet with the link) and «Editar código» inside the same card; a long code shrinks to one line, never breaks. The link behaves as the Client one. The staff app icon stays grey.

## Otros

- **#1** C04p: opened on a class already booked, «Ya reservaste esta clase» with «Cancelar reserva». C04q: another booking at that time disables the button with the reason and «Ver esa reserva».
- **#2** C01c3: a bounced e-mail shows «No pudimos entregar el correo a … Revisa la dirección.» with «Cambiar correo». Admin web `RW-clientas-ficha-correo-rebotado`: «El correo rebotó» replaces «Pendiente de activación».
- **#16** C18/C18s: a last section «Ayuda y legal» (Enviar comentarios, Soporte, Política de privacidad with a shield, Términos y condiciones); «Cuenta» keeps password, Face ID and sign-out. Staff E-F01/E-F02/E-F03 and their scrolled boards E-F24/E-F27/E-F23 use the C18 look: a deep-rose identity card with «Cambiar foto» (staff only change the photo), serif section titles outside the cards, white row cards with round icons; same order, plus «Comentarios» for administration.

Not designed here: #17 and #21 (no screen change). #3 is covered by C01k2/C01k3 above.

Prototype links in C01e2 and C01c3 point at the canvas's reference copies (`hoy-C01c…`, `hoy-C01m…`); the repository names are `C01c-revisa-tu-correo.dc.html` and `C01m-cambiar-correo.dc.html`.
