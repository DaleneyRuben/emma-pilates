# Follow-up — Perfil: no group with a single row, role in the header, a quiet footer

Targets: Client `design/v3/cliente/` C18, C18s, C18l, C18t, C25, C25b, C25c, C25d, C25e; Staff `design/v3/equipo/` E-F01, E-F02, E-F03, E-F04, E-F05, E-F11, E-F12, E-F23, E-F24, E-F27, E-F28, E-D26 and the new E-F29–E-F32; the system in `design/v3/sistema/` (`tokens.json`, `Sistema Rosa Emma.html`, `revisor/revisar.cjs`).

Written and applied on 2026-11-27 on one Claude Design canvas. After 292 shipped, the owner reviewed the Client Perfil on an iPhone and disliked groups holding a single row («Preferencias» held only «Notificaciones»). She asked for every role's Perfil to be checked so the mistake is not repeated, reviewed full-height clickable boards for all six roles over several rounds, and approved the result («ahora sí me gusta, aprobado»). This follow-up replaces 292's menu; 292's «Cerrar sesión» card in Destructivo `#A04640` and its confirmation sheet stay as they are.

## The rule

No group in any Perfil, in any role or state, has a single row. Rol and Sucursal(es) are information, not actions, so they leave the list.

## For every role

1. **Header.** The identity card keeps the photo, name, email, phone and «Cambiar foto» / «Editar». On Staff a line under the name, in `compacto-600` (Work Sans 14 weight 600), reads the role in her gender (`staffRoleLabel`) and her branches: «Instructora · Achumani, Norte», «Coordinadora · Todas las sucursales». The «Tu cuenta» group (Rol, Sucursal) is gone.
2. **No featured cards.** «Invita a una amiga» and «Tu código de referido» are ordinary rows.
3. **«Envíanos tu opinión»** replaces «Enviar comentarios» / «Sugerencias y problemas», with no subtitle. It is always the first row of «Ayuda». The screen it opens (C25–C25e, E-F11, E-F12) takes the same title; nothing else on those screens changes.
4. **«Preguntas frecuentes»** replaces «Soporte», with no subtitle and the same envelope icon. It opens the web page `app.emmapilatesstudio.com/soporte` (support email and questions), not WhatsApp.
5. **«Política de privacidad»** leaves the list for the footer. «Términos y condiciones», which neither app has, is not drawn.
6. **Order:** her work group, «Ajustes» (Notificaciones, Cambiar contraseña, Entrar con Face ID), «Ayuda» (Envíanos tu opinión, Preguntas frecuentes), the «Cerrar sesión» card, the footer. Every Staff board now draws «Entrar con Face ID», which the app already shows.

## Groups by role

| Role | Work group | Ajustes | Ayuda |
|---|---|---|---|
| Clientas | **Tu plan**: Plan actual (Activo), Evaluación nutricional, Invita a una amiga, Facturas | 3 | 2 |
| Instructora | **Tus pagos**: Historial de pagos, Tu QR de cobro, Tu código de referido (her code as the value) | 3 | 2 |
| Nutricionista, Coordinadora, Asistente | **Tus pagos**: Historial de pagos (Asistente: «Último: Bs …»), Tu QR de cobro | 3 | 2 |
| Administradora | **Administración**: Ver la app como…, Comentarios de clientas, Tu QR de cobro | 3 | none |

The Administradora has no «Envíanos tu opinión» (she is the owner) and no «Ayuda» group.

**Viendo como (E-D26).** While an Administrator sees the app as a Staff Member, that person's password, Face ID and feedback are hers, so they are not shown. «Ajustes» holds Notificaciones and «Dejar de ver como Daniela» (as today, no card at the end), and «Ayuda» is hidden: with only «Preguntas frecuentes» it would be a single row, and the person looking is the studio's administration.

## The footer

It sits directly on the page background `#F9E7DF`, with no card, centred, on two fixed lines that never wrap mid-link:

- «Emma Pilates Studio · versión 1.3.0»
- «Política de privacidad · Cerrar mi cuenta» (Clientas) or «Política de privacidad» (Staff)

Both lines are Work Sans 12 weight 400; the links are underlined at the same regular weight so they do not compete with «Cerrar sesión». Each link needs a 44 pt touch area in the apps.

## New text tone and footer styles

Rosa profundo `#93615D` reaches only 4.27:1 on `#F9E7DF`, short of AA for small text, so the footer uses a slightly darker Rosa profundo, approved by the owner:

| Role | Hex | Contrast |
|---|---|---|
| `texto-pie` | `#8A5B57` | 4.72:1 on Fondo `#F9E7DF` |

It is used only by the two footer styles, which are an exception to 285's type scale and appear nowhere else:

| Style | Spec |
|---|---|
| `pie` | Work Sans 12 · 400 · `texto-pie`, on Fondo |
| `enlace-pie` | Work Sans 12 · 400 · underlined · `texto-pie`, on Fondo |

`revisor/revisar.cjs` accepts these two styles, the `texto-pie` colour and their place on Fondo; everything else keeps 285's rules.

## New boards

E-F29 «Perfil · nutricionista», E-F30 «Perfil · nutricionista · desplazado hasta abajo», E-F31 «Perfil · coordinadora», E-F32 «Perfil · coordinadora · desplazado hasta abajo». Neither role had a Perfil board.

## Unchanged

The tab bars, the «Cerrar sesión» card and sheet, the toasts, the banner, the counts and every other screen.
