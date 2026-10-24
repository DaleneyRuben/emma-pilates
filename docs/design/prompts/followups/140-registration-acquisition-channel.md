# Follow-up — «¿Cómo nos conociste?» at registration

Targets: **01 (Iniciar sesión · Registrarse)** and the **generated handoff
`design/README.md`** (the `01` inventory row). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by BKM-011 on 2026-10-23. The owner's rules
([decisiones-emma-pilates.md](../../../decisiones-emma-pilates.md), section
10) ask every new Client how she found the studio, and a Referral Code, when
she has one, decides the answer (Booking
[ADR-0009](../../../../booking/docs/adr/0009-invite-a-friend-replaces-referral-credit.md),
glossary «Acquisition Channel» and «Referral Code»). The registration form
gains the question; the code field stays where it is and now says whose code
it can be.

## 1. The question

In every registration frame of `01` («iOS · Registrarse», «iOS · Registrarse
con código», «iOS · Registrarse · no coinciden», «iOS · Registrarse · límite
temporal»), between «Confirmar contraseña» and «¿Tienes un código de
referido?», add a field:

- Label **«¿Cómo nos conociste?»** in the field-label style (11px, weight
  500, letter-spacing 0.14em, uppercase, `#766D69`).
- Below it, eight chips that wrap onto as many rows as they need, 8px apart,
  in this order: **Instagram · TikTok · Facebook · Google · Recomendación de
  una amiga · Una instructora · Pasé por el estudio · Otro**. Each chip is
  fully rounded, 44px tall, padding 0 16px, white with a 1px `#D8C9BB`
  border and 15px `#4A4A4A` text. It is a single choice: the chosen chip
  fills Palo de rosa `#B78380` with white text and border.
- «iOS · Registrarse» shows none chosen; «iOS · Registrarse con código» shows
  «Instagram» chosen; «iOS · Registrarse · no coinciden» shows «Pasé por el
  estudio» chosen.

The answer is required. Add one frame, **«iOS · Registrarse · falta el
canal»**, after «iOS · Registrarse · no coinciden»: the form filled, no chip
chosen, every chip's border in Error `#B25D4B`, and under the chips the
message **«Elige cómo nos conociste.»** in 13px `#94493A`, the same style as
«Las contraseñas no coinciden.».

The form now scrolls: frames taller than the 874px device keep the device
height and show the top of the form (the logo may scroll away), as the app
does. Do not shrink the fields to fit.

## 2. The code

In «iOS · Registrarse con código», under the opened «Código de referido»
field, add the helper **«De una amiga o de tu instructora.»** in 13px
`#766D69`. The toggle copy «¿Tienes un código de referido?» does not change.

## 3. README

In the `01` inventory row, after «registration with «Confirmar
contraseña»», add «, the required «¿Cómo nos conociste?» chips (eight
answers, single choice; a Referral Code decides the attribution)».

## What must remain untouched

The login frames, the «Revisa tu correo» frames, and every other screen; the
fields, buttons, and copy of the registration form other than the additions
above.
