# Follow-up — Walkthrough finding 110: the owner's choice

Targets: the same surface as [278](./278-s26-unit-picker-proposals.md).
A decision record over the export in `design/v2/propuestas-falla/`; no
board is regenerated. Send [30](./30-invariants-checklist.md) alongside.

---

Written on 2026-11-18 for FIX-076. The owner chose **A · «N.º 1» con
«Número del equipo»** («la A me gusta más», relayed by the walkthrough
session).

## Staff app · S26 Reportar una falla

As `A-Una.dc.html`, `A-Seis.dc.html` and `A-Balones.dc.html` draw it:

- Under the type chips of a per-unit type, the label **«Número del equipo»**
  (14 px medium, as «¿Qué pasó?»), then the tiles **«N.º 1»**, «N.º 2»…:
  Work Sans 15 medium, 44 px high, min 72 px wide, wrapping in a row, Lino;
  the chosen one Palo de rosa with white semibold text. An out-of-service
  unit keeps «fuera de servicio» (11 px, error red; white when chosen) under
  its number.
- A type with a single unit comes with it chosen and the line «Es el único
  de esta sucursal.» (13 px muted) under the tile. With more, none is chosen.
- While «Enviar reporte» is disabled, a centred 13 px muted line above it
  says what is missing: «Para enviarlo, elige el número y cuenta qué pasó.»,
  «Para enviarlo, elige el número del Reformer.» (the type's name), «Para
  enviarlo, cuenta qué pasó.», or for a quantity type with nothing usable
  «No hay ninguno que se pueda usar.» It goes away once the button is
  enabled.

Options B and C are not built.
