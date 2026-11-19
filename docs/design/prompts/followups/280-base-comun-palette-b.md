# Follow-up — Base común: palette B and the shared pieces

Targets: every surface (client app, staff app, admin web, public site).
A decision record; no board is regenerated in this round. The approved
canvas https://claude.ai/artifact/8v5yrLF8zXf2yzci8SF8WH stays the
reference (boards `ColorB`, `BotonA`, `BotonAPiezas`, `EncabezadoA`,
`ClaseE`, `FormB`, `ListaC`). Send [30](./30-invariants-checklist.md)
alongside when the screens are regenerated.

---

Written on 2026-11-19 for FIX-089, from the owner's round-1 picks after the
2026-11-19 design audit (`DECISIONES-AUDITORIA-2026-11-19.md`). From here on,
read this palette and these pieces instead of the colour table, button and
card rules in `design-system.md` before this date and in every earlier
prompt.

## Only five colours

Rubor `#E7CCBF`, Rosa arcilla `#CDA697`, Palo de rosa `#B78380`, Rosa
profundo `#93615D`, Crema `#F9F4F2`. No greys, no olive, no white, and no
status colours: success, warning and error are said with words, weight, a
Rubor pill or Rosa profundo.

- Page: Crema. Card: Crema with a 1px Arcilla border, radius 16. Hero: Palo
  de rosa, radius 18, with large Crema text only.
- Text: always Rosa profundo; hierarchy from size and weight. Lora for
  headings and big figures, Work Sans for everything else.
- Primary button: Rosa profundo with a Crema label, one per screen.
  Secondary: Crema with a 1.5px Rosa profundo border. Destructive: the
  secondary look plus a confirmation. Disabled: Crema with an Arcilla border
  and a reason line under it.
- Chips: selected Rosa profundo with a Crema label; unselected Crema with an
  Arcilla border.
- Pill: only for an exception («Por vencer», «Primera clase»), Rubor with
  bold Rosa profundo text. Unread is bold, not a pill.
- No tinted discs behind icons.

## Encabezado A

The back arrow on its own row (44 pt target), then the screen's own large
Lora title (30) under it; never the parent screen's name. A tab's root draws
the title alone.

## Clase E

The next class is a Palo de rosa hero: «PRÓXIMA · EN 40 MIN» and «2 de 8»,
«08:00 · Mat Pilates» in Lora 26, «Achumani · Lucía y Elena». Other classes
are rows on one card: the time in a Rubor box, the class and the branch,
«N de M» at the end. Cancelled classes fold at the end in one line,
«N canceladas por mínimo · Ver».

## Form B

Examples sit under the field as «Ej.: …», never in the placeholder; password
fields show no dots. Saving with fields missing draws a Rubor box at the top,
«Faltan N datos para guardar» and the labels joined by « · », and marks each
field with a 2px Rosa profundo border and a bold message.

## Lista C (web at 420 px)

A 40px Palo de rosa circle with Crema initials, the name, one secondary line
and a chevron; a filter chip row on top; a Rubor pill only for the exception.
