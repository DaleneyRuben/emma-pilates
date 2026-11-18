# Follow-up — Walkthrough findings 101 and 103: the owner's choice

Targets: the same surfaces as [269](./269-equipment-types-proposals.md) and
[270](./270-equipment-number-taken-warning.md). A decision record over the
export in `design/v2/propuestas-equipos/`; no board is regenerated. Send
[30](./30-invariants-checklist.md) alongside.

---

Written on 2026-11-18 for DES-020 and FIX-067. The owner chose **A · Una
sección por tipo** («vamos con la A», relayed by the walkthrough session).

## Estudio › Equipos

Option A as `Selector.dc.html` (1440) and `OpcionA420.dc.html` (420) draw it:

- **Nuevo tipo** is the title row's primary button. Its panel is 269's
  («Nombre», «¿Cómo lo llevas?» with «Por unidad, con número» and «Por
  cantidad», the Branch's starting quantity for «Por cantidad»).
- **Fallas abiertas** stays above the sections, for every type: a unit's
  fault (with «Fuera de servicio» when it is out of service) and a quantity's
  damage («Balones · 1 dañado») with **Dar de baja** and **Marcar resuelta**.
- One section per type, the three seeded types first (Reformer, Cadillac,
  Mat), then the studio's types by name. Each head shows the name, «· N
  unidades» or «· N en total», the «Con número» / «Por cantidad» pill,
  **Agregar** (per unit only) and **Editar tipo**.
- Per unit: today's table (Equipo, Estado, Registrar falla, Dar de baja);
  empty: «Sin unidades en esta sucursal.»
- By quantity: one card with the count «en esta sucursal», «N se pueden
  usar», «N dañados» when any, **Registrar daño** (disabled with nothing
  usable) and **Cambiar cantidad**.
- **Agregar** follows 270: the first free number filled in, a taken number
  warned as it is typed, no «Se mostrará como…» line then, the button
  disabled.
- At 420 the tables become the stacked rows `OpcionA420.dc.html` draws.

## Staff app · S26 Reportar una falla

`Reportar.dc.html`, unchanged from 269: chips that scroll, the Session's
type first; per-unit tiles with «No se puede usar», or «¿Cuántos se
dañaron?» with − and + for a quantity type.

Options B and C are not built.
