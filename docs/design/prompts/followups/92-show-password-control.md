# Follow-up — the show/hide password control

Targets: **Sistema de Diseño (Prompt 00)** (section 07 «Fundamentos»: one
new «Campo de contraseña» card); **every password input of `01`, `21`,
`23`, `24`, `S01`, `S19`, `S23`, `AW01`, `AW32`, and `AW33`** (the eye
inside the input, hidden state); **generated handoff `design/README.md`**
(one bullet after «Inputs»). Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written by MOB-059 on 2026-10-15 (the admin web side is WEB-022). Testing
the first Play Internal testing builds and the production admin web, the
user mistyped a password and had no way to see what they had written: every
password field in both apps and in the admin web is masked with no way to
reveal it, so a typo on a phone keyboard means clearing the field and
typing it again blind. The design system draws no password control.

## 1. The control

Every password input carries an **eye button inside its right end**:

- **Placement.** The button sits inside the input, vertically centred,
  flush with the right edge: a 44 × 44 px touch target on mobile, 40 × 40 px
  on the admin web, with no fill and no border of its own. The input's
  right padding grows to 52 px (48 px on the admin web) so typed text never
  runs under the icon. The input's height, border, radius, background,
  focus ring, and error border stay exactly as they are.
- **Icon.** A 20 px outline eye on the 24-unit grid, 1.3 px stroke, Plomo
  cálido `#766D69`, round caps and joins: the almond outline
  (`M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z`)
  with a 3-unit pupil at the centre. The shown state adds one diagonal
  slash from (4, 4) to (20, 20), the eye-off.
- **States.** Every field **starts hidden** (dots, open eye, «Mostrar
  contraseña»). A tap shows the typed text (eye-off, «Ocultar
  contraseña»); a second tap hides it again. Toggling keeps the typed value
  and the cursor; it never clears the field, moves focus away, or submits.
  Each field toggles on its own: «Contraseña» and «Confirmar contraseña»
  are independent.
- **Accessibility.** The button's spoken label is the action it will take,
  «Mostrar contraseña» or «Ocultar contraseña», with the button role; on
  the admin web it is a real `<button type="button">` reachable by Tab
  with the standard focus ring, and `aria-pressed` follows the shown state.
- **Disabled field.** When the field is disabled the eye is disabled with
  it (icon at `#C4BAB6`).

No screen gains copy, a hint, or a «Mostrar» text link: the icon and its
spoken label are the whole control.

## 2. Sistema de Diseño — section 07 «Fundamentos»

Add a fifth card to the grid, after «Elevación», titled «Campo de
contraseña», holding two stacked 52 px inputs as `01` draws them:

1. «••••••••» with the open eye, captioned «Oculta · Mostrar contraseña».
2. «Calma2026» as text with the eye-off, captioned «Visible · Ocultar
   contraseña».

Under them, one note in the card's 13 px Plomo cálido: «Ojo de 20 px dentro
del campo, área táctil de 44 px (40 px en la web). Empieza oculta; el valor
y el cursor se mantienen.»

## 3. The screens

In every password input of `01` (login and registration),
`21` and `S19` (Contraseña nueva and Confirmar contraseña), `23` (all three
fields), `24` (the confirmation field), `S01`, `S23` (its change-password
fields), `AW01`, `AW32`, and `AW33`'s change-password panel, add the eye
button in its **hidden** state as §1 describes, and nothing else. The
frames keep their values, placeholders, error borders, notices, and every
other element unchanged; a frame that shows a field with an error keeps
its Error border with the eye inside it.

## 4. README — «Inputs»

After the «Inputs» bullet, add:

> - Password inputs carry an eye button inside the right end (20px outline
>   eye, 1.3px stroke, `#766D69`; 44px touch target on mobile, 40px on the
>   admin web; right padding 52px/48px). Every field starts hidden; a tap
>   shows the text with the eye-off and a second tap hides it, keeping the
>   value and the cursor. Its label is the action: «Mostrar contraseña» /
>   «Ocultar contraseña» (a real `button type="button"` with `aria-pressed`
>   on the web).

## What must remain untouched

Every other input, every button, notice, copy line, and layout of the
listed frames; every frame not listed; every other section of the design
system and every other README section.
