# Follow-up — the busy state of the primary and destructive buttons

Targets: **Sistema de Diseño (Prompt 00)** (section 03 «Botones»: one new
«Ocupado» sample in the «Primario» row and one busy destructive sample);
**generated handoff `design/README.md`** (one bullet in «Buttons»). No
numbered screen changes: busy is a moment between a tap and the answer, not
a screen state anyone stops on. Send [30](./30-invariants-checklist.md)
alongside this follow-up.

---

Written by MOB-060 on 2026-10-15 (the admin web side is WEB-023). Testing
the first Play Internal testing builds against production, the user tapped
«Iniciar sesión» and saw only the button turn grey: on a phone network the
answer takes a second or more, and the disabled grey reads as «this is not
available», not «we are working on it». Every submit in both apps and in the
admin web does the same today. The design system draws Normal, Foco,
Presionado, and Deshabilitado for the primary button, and nothing for a
request in flight.

## 1. The state

From the tap until the request answers, the button that sent it is
**busy**:

- **Fill and border stay as they are** (primary: Palo de rosa `#B78380`
  with its shadow; destructive: the Error `#B25D4B` outline on its own
  background). It never turns to the Deshabilitado `#E7DCD8`/`#B3A9A5`
  colours: grey means unavailable, and the button is not unavailable, it is
  working.
- **A spinner takes the label's place**, centred: the platform's small
  activity indicator on mobile (20 px, the native iOS and Android one), a
  16 px ring on the admin web (2 px stroke, a quarter arc on a
  `rgba(255,255,255,0.35)` track, one turn every 0.8 s). It is white on the
  primary fill and Error `#B25D4B` on the destructive outline.
- **The size does not change.** The label is kept invisibly for layout, so
  the button stays exactly as wide and as tall as it was with its label;
  nothing around it moves.
- **Taps are ignored** while busy, so the request is never sent twice.
- **Screen readers** still hear the label, with the busy state
  («Iniciar sesión, ocupado» on mobile; `aria-busy` on the admin web).
- The spinner keeps turning under Reduce Motion, as the systems' own
  activity indicators do: it is the only sign of progress.
- When the answer arrives the label comes back, or the screen moves on.
  Errors keep their existing places (the form alert, the field error, the
  notice); the busy state adds no message of its own and no «Cargando…»
  text.

Only the button that was tapped is busy. Other buttons on the view keep
their own state (a «Cancelar» text button stays tappable unless the screen
already disables it).

## 2. Sistema de Diseño — section 03 «Botones»

- In the «Primario» row, after «Deshabilitado», add a fifth sample: the
  same 210 px «Reservar clase» button with its normal fill and shadow, the
  white spinner centred where the label was and no visible text, captioned
  «Ocupado · spinner en lugar del texto, mismo tamaño».
- In the «Secundario y terciario» row, after the existing samples, add the
  destructive button as `24` draws it («Cerrar mi cuenta»: 1 px Error
  `#B25D4B` outline on Blanco, Error label, 54 px tall) in its busy state:
  outline and background unchanged and an Error `#B25D4B` spinner where the
  label was, captioned «Destructivo ocupado». The section has no destructive
  sample today; this is the only one it gains.

Draw the spinner as a still quarter arc on its faint track (a static file
cannot turn); the caption names the state.

## 3. README — «Buttons»

After the «Destructive» bullet, add:

> - Busy (from the tap until the request answers): the button keeps its
>   fill, border, shadow, width, and height; a spinner replaces the label
>   (the native small activity indicator on mobile, a 16px ring turning
>   every 0.8s on the admin web), white on the primary fill and Error
>   `#B25D4B` on the destructive outline; taps are ignored, screen readers
>   hear the label as busy, and it never uses the Deshabilitado colours.

## What must remain untouched

Every numbered screen and its buttons; the Normal, Foco, Presionado, and
Deshabilitado samples; the secondary, tertiary, compact neutral, and icon
samples already drawn; every other section of the design system
and every other README section.
