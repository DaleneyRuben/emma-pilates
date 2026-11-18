# Follow-up — Walkthrough finding 103: a taken equipment number warns while typing

Targets: the three proposals of [269](./269-equipment-types-proposals.md)
(`design/v2/propuestas-equipos/`), their «Agregar» panel for a per-unit
type, at 1440 and 420, and the canvas's `Main.dc.html`. Send
[30](./30-invariants-checklist.md) alongside this follow-up.

---

Written on 2026-11-18 for DES-020 and FIX-067 (walkthrough finding 103).

## Why

In today's «Nuevo equipo», with «Reformer 1» already registered, typing 1
still reads «Se mostrará como Reformer 1.», and only after **Guardar** does
«Ya hay un Reformer 1 en esta sucursal.» appear under that same line. The
page already holds the Branch's equipment, so it can tell at once.

## Change (the same in A, B and C)

- Under «Número», one line at a time:
  - nothing valid typed: «Del 1 al 99, único por tipo en esta sucursal.»;
  - a free number: «Se mostrará como Reformer 7.»;
  - a number in use among the type's units in this Branch (not counting
    those given away): «Ya hay un Reformer 1 en esta sucursal. El primer
    número libre es el 5.» in the error colour, announced as an alert, the
    field marked invalid, and no «Se mostrará como…» line.
- **Agregar** stays disabled while the number is empty, invalid or taken.
- The panel opens with the first free number filled in (5 when 1–4 exist).
- The server's refusal stays as a fallback for a number taken meanwhile.
- The prototype strip gains «Número ocupado» (Agregar Reformer with 1
  typed); typing another number in the field updates the line.
- `Main.dc.html` adds one line under «En las tres» saying so.
