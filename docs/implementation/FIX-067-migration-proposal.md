# FIX-067: migration proposal for studio-defined equipment types

Walkthrough finding 101. Needs the owner's explicit approval before it is
written. Expand-only: nothing is dropped, nothing is hard-deleted, and every
row registered today keeps its id, its faults and its history.

## Why a migration

`back_office.equipment.kind` is the enum `EquipmentKind` (reformer, cadillac,
mat), so a new kind needs a schema change, and nothing can hold a count
(«Balones: 12, 1 dañado»).

## Proposed: `20261118120000_equipment_types`

1. **New table `back_office.equipment_types`** (studio-wide):

   | column | type | notes |
   |---|---|---|
   | id | uuid pk | |
   | name | text NOT NULL | trimmed, 1–40 characters; renamable |
   | tracking | enum `EquipmentTracking` (`unit`, `quantity`) NOT NULL | immutable (trigger) |
   | legacy_kind | `EquipmentKind` NULL UNIQUE | set only on the three seeded types |
   | created_by_account_id | uuid NULL → system.accounts (RESTRICT) | NULL for the seeded types |
   | created_at, updated_at | timestamptz(3) | |
   | archived_at | timestamptz(3) NULL | «Quitar tipo»; final (trigger) |

   Unique index on `lower(name)` among types not archived. Deletes rejected
   (`reject_history_delete`, as every back-office history table).

2. **Seed** three types, `tracking = unit`: Reformer, Cadillac, Mat, with
   `legacy_kind` reformer, cadillac, mat.

3. **`back_office.equipment`** (numbered units) gains `type_id uuid` →
   equipment_types (RESTRICT): added nullable, backfilled from `kind` through
   `legacy_kind`, then NOT NULL. `kind` becomes nullable and is still written
   for units of the three seeded types (old Staff app builds read it); it is
   left for a later contract step. The unique index becomes
   `(branch_id, type_id, number) WHERE archived_at IS NULL` (replacing the
   kind index; an index, no data). `type_id` joins the immutable identity in
   `protect_equipment`; an insert must name a `unit` type (trigger).

4. **New table `back_office.equipment_stocks`** (one row per Branch × quantity
   type): id, branch_id → branches, type_id → equipment_types (must be a
   `quantity` type, trigger), `quantity integer NOT NULL CHECK 0..9999`,
   created_at, updated_at. Unique `(branch_id, type_id)`. Only `quantity`
   changes; each change is audited (`equipment.quantity_changed`). Deletes
   rejected.

5. **`back_office.equipment_issues`** also covers damage on a quantity type:
   `equipment_id` becomes nullable; new `stock_id` → equipment_stocks NULL,
   `quantity smallint` NULL, `written_off boolean NOT NULL DEFAULT false`.
   CHECK: exactly one of `equipment_id` / `stock_id`; `quantity` ≥ 1 exactly
   when `stock_id` is set; `out_of_service` false on stock damage;
   `written_off` only on a resolved stock damage. «Dar de baja» resolves the
   damage with `written_off` and lowers the stock's quantity by it in the
   same transaction. The immutability trigger covers the new columns.

Usable = quantity − the open damage on that stock. Registering damage beyond
the usable count, or lowering the quantity below the open damage, is refused
by the API under a row lock on the stock.

## API (additive, old builds keep working)

- `GET/POST/PATCH administrator/equipment-types` (create, rename, archive).
- `EquipmentDto` gains `typeId`, `typeName`; `kind` is kept (deprecated,
  present for the three seeded types). Quantity types answer through
  `administrator/equipment-stocks` (quantity, usable, open damage).
- The Trainer's session equipment keeps `items` (seeded kinds only, for old
  builds) and adds `types` with every type, units and stocks.
- The Horario flag matches a class to a `unit` type whose name is a word of
  the class's name, as it matches the three kinds today.

## Not chosen

- **Keep the enum and add values per request**: every new accessory needs a
  release; no counts.
- **Put accessories in Insumos**: Insumos is for consumables (stock,
  withdrawals, restocking); damage and write-off do not fit.
- **One table for units and counts** (quantity column on `equipment`):
  per-unit rows would carry a meaningless quantity and the per-number unique
  index would need exceptions.
