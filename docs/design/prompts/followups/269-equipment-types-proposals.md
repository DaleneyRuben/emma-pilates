# Follow-up — Walkthrough finding 101: studio-defined equipment types (proposals)

Targets: **P07 Estudio › Equipos** (AW37, 1440 and 420) and the Staff app's
**S26 Reportar una falla**, as proposals only, on a canvas of their own
exported to `design/v2/propuestas-equipos/`. Read with
[225](./225-visual-system-v2.md), [233](./233-admin-web-pages-on-v2.md) and
[170](./170-aw02-equipment-flags.md). Send
[30](./30-invariants-checklist.md) alongside this follow-up. No exported
screen is regenerated here: a later follow-up records what the owner chose.

---

Written on 2026-11-18 for DES-020 and FIX-067 (walkthrough finding 101).

## Why

Equipos only knows three kinds, Reformer, Cadillac and Mat, each piece
numbered 1–99. The studio also owns balls, rings, bands and other
accessories and has nowhere to register them; Insumos is for what gets used
up (stock, withdrawals, restocking), so it is not the place. The owner's
decision (2026-11-18), «tipos propios»:

- the studio creates its own equipment types with **Nuevo tipo**;
- each type is kept either **por unidad, con número** (as today: Reformer 1,
  Reformer 2…, a fault per machine, «Fuera de servicio») or **por cantidad**
  («Balones: 12, 1 dañado»);
- Reformer, Cadillac and Mat become types that already exist, kept per unit,
  with every machine registered today.

## What every option keeps

- A type belongs to the whole studio and shows in every Branch; each Branch
  keeps its own units or its own quantity. The subtitle reads «Sucursal
  Achumani · 6 tipos · 3 fallas abiertas».
- **Nuevo tipo** (side panel at 1440, sheet at 420): «Nombre», «¿Cómo lo
  llevas?» with two choices, «Por unidad, con número» («Cada una tiene su
  número y sus fallas: Reformer 1, Reformer 2…») and «Por cantidad»
  («Cuentas cuántas hay y cuántas están dañadas: Balones 12, 1 dañado»);
  for «Por cantidad», «Cantidad en Sucursal Achumani». A note: «El tipo es
  para todo el estudio. Cómo se lleva no se puede cambiar después.» A
  repeated name is refused: «Ya hay un tipo con ese nombre.» Notice:
  «Creamos el tipo Rodillos.»
- **Per unit** works as today: **Agregar** asks for «Número» («Del 1 al 99,
  único por tipo en esta sucursal.»), each row has its pill (Funciona, Con
  falla, Fuera de servicio), **Registrar falla** and **Dar de baja**.
- **By quantity**: the number in the Branch, «N se pueden usar» and «N
  dañados». **Registrar daño** asks «¿Cuántos?» (1 up to the usable count)
  and «¿Qué pasó?»; it is an open fault like a machine's. **Cambiar
  cantidad** sets the total («Cuenta también los dañados. Si se perdieron o
  se botaron, baja el número.»).
- An open damage is resolved two ways: **Marcar resuelta** (they are usable
  again) or **Dar de baja** (they leave the total, 12 → 11).
- **Editar tipo**: rename it, or **Quitar tipo** when no Branch has units or
  a quantity of it: «Primero da de baja sus unidades en todas las
  sucursales.» Nothing is erased; its history stays.
- Horario's «Faltan equipos» keeps matching a class to a per-unit type whose
  name is a word of the class's name («Reformer Intermedio» → Reformer).
- Empty Branch: every type still shows, «Sin unidades en esta sucursal.» or
  «0 en esta sucursal».

## The canvas

`Main.dc.html` states the three options (A recommended). Each option has a
clickable board at 1440 and one at 420. A dark strip at the top of each
board is the prototype's control and not part of the design; its chips jump
to «Equipos», «Nuevo tipo», «Registrar daño», «Cambiar cantidad», «Fallas
de un tipo» and «Sucursal sin equipos»; the page's own buttons work too.

1. **A · Una sección por tipo** (recommended). Today's page, one section per
   type: per-unit types keep their table, by-quantity types are one card
   with the count, the pills and their two actions. «Fallas abiertas» stays
   on top for every type. «Nuevo tipo» is the title's button; «Agregar» and
   «Editar tipo» sit at each section's head.
2. **B · Tarjetas de tipo**. A grid of one card per type (name, how it is
   kept, the count, what is wrong) and a dashed «Nuevo tipo» card. Choosing
   a card opens its detail below the grid: the unit table or the quantity
   card. «Fallas abiertas» stays above the grid.
3. **C · Lista y detalle**. A list of types on the left in two groups, «Con
   número» and «Por cantidad», with their counts and a warning mark; the
   chosen type's detail on the right, its own open faults inside it. At 420
   the list comes first and a type opens on its own screen with «Volver».

**S26 Reportar una falla** (the same in the three options): the type tabs
become chips that scroll sideways, the Session's own type first. A per-unit
type shows its numbered tiles and «No se puede usar» as today; a by-quantity
type shows «Hay 11 que se pueden usar» and «¿Cuántos se dañaron?» with − and
+ instead of the tiles and the switch.

## Keep

P07's other tabs (Personal, Insumos), Insumos' own page, S26's sent screen;
the brand, colours and type of 225.
