# Follow-up — The mobile number with a country code: proposals

Targets: **C01 Regístrate** and **C22 Editar perfil** (Client app v2), **S05
Nuevo cliente** and **S28 Para contactar** (Staff app v2), **P07 Estudio ›
Personal** with «Invitar a alguien», and **P03 Clientas › ficha** (admin web
v2), as proposals only, on a canvas of their own. Read with
[225](./225-visual-system-v2.md) and [233](./233-admin-web-pages-on-v2.md).
Send [30](./30-invariants-checklist.md) alongside this follow-up. No exported
screen is regenerated: the owner picks one proposal, and a later follow-up
carries it into C01b, C22, S05, S28, P03, P07 and P11.

---

Written on 2026-11-05 for DES-006 (walkthrough of 2026-11-04, n.º 5 and 6).

## Why

- **The owner decided (2026-11-04/05) that the mobile number is required when
  a client registers herself.** Today C01b asks for name, email and password
  only; the number can be added later in C22, and S05 marks it «(opcional)».
  «Para contactar» exists so the Coordinator can write to new clients by
  WhatsApp by hand, and without a number she cannot.
- **Some clients have numbers from other countries**, so the field has to say
  which country the number belongs to.
- **Bolivia stays the default.** FIX-036 (pull request #287) fixed the
  Bolivian rule: 8 digits starting with 6 or 7, the `+591` implicit (nobody
  types it; typing it is still accepted), stored always as `+591 XXXXXXXX`.
  Every proposal keeps that rule for Bolivia and stores other countries the
  same way: `+<code> <national digits>`, digits only after the space.
- The owner knows two patterns: a dropdown of country codes with flags, and a
  plain code selector without flags. She asked for several proposals.

## The proposals

Three, each a clickable prototype on the same boards, with the same data
(Lucía Fernández, Bolivia, `71234567`; Valentina Ríos, Perú, `912345678`;
Martina Gómez, Argentina, `91123456789` in the lists):

- **A · Prefijo con bandera.** One field. Its left end is a tappable prefix
  «🇧🇴 +591 ⌄» separated from the digits by an Arena hairline; the digits
  are typed after it. Tapping the prefix opens a country list with a search
  field, flags, names and codes: Bolivia first and checked, then «Frecuentes»
  (Argentina, Brasil, Chile, Perú, Paraguay), then «Todos los países» A–Z.
- **B · Código sin bandera.** Two fields side by side: «Código» (96 px,
  «+591») and «Celular». «Código» opens the platform's own picker with text
  only, «+591 Bolivia», «+54 Argentina»…: the wheel on iPhone, a dialog with
  radio rows on Android.
- **C · Bolivia sin preguntar.** One field for the 8 digits, no country
  control at all, and under it a quiet link «¿Tu número no es de Bolivia?».
  The link swaps the field for A's prefix field with the country list open.
  Bolivian numbers display without `+591` in the apps' lists; foreign ones
  with their code and the country's name.

## What every proposal shows

1. **Regístrate (C01b)**, the phone field third, after Nombre and Correo
   electrónico, labelled «Celular» (no «(opcional)»), helper «Te escribimos
   por WhatsApp si hace falta.» The screen scrolls; the board shows its top.
   A board tweak «estado» switches between:
   - **Bolivia**: Bolivia preselected, `71234567` typed, the `+591` shown but
     never typed.
   - **Elegir país**: the country list open (tap the prefix, the «Código»
     field or C's link to get there too). A tweak «plataforma»: iPhone draws
     the list as a sheet with a grabber and «Cancelar»; Android draws it as a
     full-screen dialog with a back arrow and the search in the top bar (A,
     C) or the platform pickers (B).
   - **Otro país**: Perú chosen, `912345678` typed.
   - **Falta el celular**: tapped «Crear cuenta» with the field empty: Error
     hairline on the field and, under it, `error` icon plus «Escribe tu
     celular. Lo necesitamos para escribirte por WhatsApp.»
   - **Número no válido**: Bolivia with `5123456`: «Un celular de Bolivia
     tiene 8 dígitos y empieza con 6 o 7.»; with Perú, «Un celular de Perú
     tiene 9 dígitos y empieza con 9.»
   Error copy in Error `#A04E3E`, 13 px, under the field; the field keeps
   Lino with a 1.5 px Error border. No toast and no notice for field errors.
2. **Editar perfil (C22)**, «Teléfono» renamed «Celular», with Lucía's stored
   number shown in the proposal's field. Required here too: clearing it shows
   «Falta el celular».
3. **Nuevo cliente (S05)**, Staff app: the same field in S05's grouped card,
   «Celular» without «(opcional)», the same errors and picker.
4. **Para contactar (S28)**, Staff app: three clients (Lucía Bolivian,
   Valentina Peruvian, Martina Argentine) showing the stored value as the
   proposal displays it, each «Abrir WhatsApp» going to `wa.me/<code><digits>`.
5. **Admin web at 1440 px**: P07 Estudio › Personal with «Invitar a alguien»
   open in the side panel (Nombre, Correo electrónico, Celular, Rol, Sedes),
   and a tweak «vista» switching to P03's ficha (the Contacto card) and the
   Personal table. The table's Contacto column and the ficha show the stored
   value as the proposal displays it; one staff member has a foreign number.
6. **Admin web at 420 px**: the «Invitar a alguien» panel full width with the
   proposal's field, its open country list and the «Número no válido» error.

## The index board

A first board «Celular con código de país» with the three proposals as
cards: name, one line on how it works, a small drawing of the field, and links
to each proposal's boards. A comparison table under the cards (familiar,
taps for a Bolivian client, taps for a foreign one, how lists read, risk of a
wrong country), and «Recomendada» on A. Brand «Emma Pilates Studio» in full,
no tagline.

## Leave untouched

Every exported screen. Only v2 tokens: Lino fields with the Arena border,
Rosa enlace for the prefix's code and links, Error only for errors, Rosa
profundo once per page. Flags are emoji in the drawing; the code may use
images if Android draws them badly.
