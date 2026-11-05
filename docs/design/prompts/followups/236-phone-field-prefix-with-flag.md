# Follow-up — The mobile number with a country code: proposal A on the screens

Targets: **C01b Regístrate** and **C22 Editar perfil** (Client app v2), **S05
Nuevo cliente** (both boards) and **S28 Para contactar** (Staff app v2), **P03
Clientas**, **P07 Estudio** and **P11 Clientas · 420 px** (admin web v2).
Read with [235](./235-phone-country-code-proposals.md), whose boards
`design/v2/propuestas-telefono/A1`–`A6` stay the reference for the field's
other states. Send [30](./30-invariants-checklist.md) alongside this
follow-up. Regenerate only the boards named here; every other board is
untouched.

---

Written on 2026-11-05 for DES-006.

## Why

The owner chose **A · Prefijo con bandera** from follow-up 235 on 2026-11-05.
This follow-up carries it into the exported screens so the apps and the admin
web can be built from them.

## The field

One field, as drawn on A1–A6. Its left end is a tappable prefix «🇧🇴 +591 ⌄»
in Rosa enlace, 600, separated from the digits by an Arena hairline; the
digits follow, `inputmode="numeric"`, placeholder «8 dígitos» (Bolivia) or
«9 dígitos» (Perú). The label is **«Celular»** everywhere, never «Teléfono»
and never «(opcional)». Tapping the prefix opens the country list of A1–A3
(iPhone sheet, Android full-screen list) or, on the web, the popover of A5–A6.
Errors are those of A1–A6, in Error under the field:

- «Escribe tu celular. Lo necesitamos para escribirte por WhatsApp.»
- «Un celular de Bolivia tiene 8 dígitos y empieza con 6 o 7.»
- «Un celular de <país> tiene <n> dígitos y empieza con <…>.» for other countries.

Stored as `+<code> <digits>`. In lists and cards the number reads with its
flag: «🇧🇴 +591 70712345». Flags are emoji in the drawing; the code may swap
them for images if Android draws them badly.

## Per board

1. **C01b Regístrate**: the field third, after «Correo electrónico» and before
   «Contraseña», value `70712345`, helper under it «Te escribimos por WhatsApp
   si hace falta.» The screen scrolls; the board grows to 930 px tall so
   «Crear cuenta» and «¿Ya tienes una cuenta?» stay in view.
2. **C22 Editar perfil**: «Teléfono» becomes the field, Lucía's stored
   `+591 70712345` shown as prefix plus `70712345`.
3. **S05 Nuevo cliente** and **S05 · con código de referido**: the phone row
   of the grouped card becomes the prefix row (prefix, hairline, «Celular»
   over the digits). Empty on S05 (placeholder «8 dígitos»), `70000002` on the
   referral board.
4. **S28 Para contactar**: Sofía's line reads «🇧🇴 +591 70000002 · empezó el
   2 de noviembre». «Abrir WhatsApp» keeps `wa.me/59170000002`.
5. **P03 Clientas**: the Contacto column, the ficha's Contacto card and the
   «Para contactar» rows show the number with its flag.
6. **P07 Estudio › Personal**: the table and the person panel show the number
   with its flag; Andrea Suárez has an Argentine number,
   «🇦🇷 +54 91123456789». «Invitar a alguien» opens its own side panel (it
   opened Daniela's until now): Nombre, Correo electrónico, Celular (the
   field, helper «La recepción lo usa para escribirle por WhatsApp.»), Rol,
   Sedes, the activation note, «Cancelar» and «Enviar invitación».
7. **P11 Clientas · 420 px**: Lucía's number with its flag.

## Leave untouched

Everything else on these boards and every other board. Only v2 tokens.
