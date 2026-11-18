# Follow-up — Walkthrough finding 110: S26's unit picker (proposals)

Targets: **S26 Reportar una falla** (staff app, iPhone 390) as
[271](./271-equipment-types-approved-option.md) left it
(`design/v2/propuestas-equipos/Reportar.dc.html`), as proposals on a canvas
of its own exported to `design/v2/propuestas-falla/`. Read with
[225](./225-visual-system-v2.md) and 269. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written on 2026-11-18 for FIX-076 (walkthrough finding 110).

## Why

In the walkthrough, Achumani has a single Reformer. Under the type chips
the screen showed one big tile reading only «1», with nothing saying what it
was («el número abajo de Reformer se ve muy tamaño y no sé qué es»). It was
not selected even though it was the only one, and «Enviar reporte» stayed
disabled without saying why.

## What every option keeps

- **One unit, already chosen**: when the type has a single unit, it comes
  selected and the line «Es el único de esta sucursal.» sits under it. With
  more than one, none is selected.
- **What is missing, next to the button**: while «Enviar reporte» is
  disabled, a centred 13 px muted line above it names what is left («Para
  enviarlo, … y cuenta qué pasó.», «Para enviarlo, cuenta qué pasó.»). A
  quantity type with nothing usable says «No hay ninguno que se pueda
  usar.» The line goes away once the button is enabled.
- The quantity card (Balones), the switch and the rest of S26 stay as 271
  draws them. The middle of the screen scrolls when the units overflow.

## The options

- **A · «N.º 1» under «Número del equipo» (recommended)**: the heading in the
  14 px medium label style of «¿Qué pasó?»; tiles Work Sans 15, 44 px high,
  as wide as their text (min 72 px), wrapping in a row; an out-of-service
  unit keeps «fuera de servicio» under its number (52 px). Hint: «Para
  enviarlo, elige el número del Reformer.»
- **B · «Reformer 1» under «¿Cuál?»**: the same tiles naming the type.
  Hint: «Para enviarlo, elige qué Reformer falló.»
- **C · a list under «¿Cuál?»**: full-width 48 px rows with a radio circle,
  «Reformer 1» and «fuera de servicio» at the right; the chosen row on Rosa
  tinte with a Palo de rosa ring.

## Boards

Four rows (Antes, A, B, C) of three clickable boards each: Achumani with one
Reformer (out of service), a Branch with six Reformers and none chosen (the
disabled button with its line), and Balones by quantity. Chips, units,
typing in «¿Qué pasó?» and the button's line follow the taps.
