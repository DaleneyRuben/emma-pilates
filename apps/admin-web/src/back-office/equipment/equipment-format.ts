import type {
  EquipmentDto,
  EquipmentIssueDto,
  EquipmentStockDto,
  EquipmentTypeDto,
} from "@pilates/api-contracts";

/** «1 dañado», «2 dañados»: a count with its word. */
export const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** «Reformer 5»: a unit is named by its type and number. */
export const unitName = (typeName: string, number: number) =>
  `${typeName} ${number}`;

export const pieceName = (piece: EquipmentDto) =>
  unitName(piece.typeName, piece.number);

export const damagedLabel = (n: number) => plural(n, "dañado", "dañados");

/** What a confirmation or a notice calls the faulty thing. */
export const issueSubject = (issue: EquipmentIssueDto) =>
  issue.quantity === null
    ? unitName(issue.typeName, issue.equipmentNumber ?? 0)
    : issue.typeName;

/** A unit's fault names the unit; a stock's damage, «Balones · 1 dañado». */
export const issueTitle = (issue: EquipmentIssueDto) =>
  issue.quantity === null
    ? issueSubject(issue)
    : `${issue.typeName} · ${damagedLabel(issue.quantity)}`;

/** A whole number 0–9999 typed in a field, or null; empty counts as 0. */
export const parseQuantity = (text: string) =>
  text === "" ? 0 : /^\d{1,4}$/.test(text) ? Number(text) : null;

/** Follow-up 270: the lowest number none of the type's units use. */
export const firstFreeNumber = (numbers: readonly number[]) => {
  let free = 1;
  while (numbers.includes(free)) free += 1;
  return free;
};

export const trackingLabel = {
  unit: "Con número",
  quantity: "Por cantidad",
} as const satisfies Record<EquipmentTypeDto["tracking"], string>;

export const trackingLong = {
  unit: "Se lleva por unidad, con número.",
  quantity: "Se lleva por cantidad.",
} as const satisfies Record<EquipmentTypeDto["tracking"], string>;

/** One type's units or stock in the selected Branch. */
export type TypeHolding =
  | { type: EquipmentTypeDto; tracking: "unit"; units: EquipmentDto[] }
  | { type: EquipmentTypeDto; tracking: "quantity"; stock: EquipmentStockDto };

export const holdingsOf = (
  types: readonly EquipmentTypeDto[],
  units: readonly EquipmentDto[],
  stocks: readonly EquipmentStockDto[],
  branchId: string,
): TypeHolding[] =>
  types.map((type) =>
    type.tracking === "unit"
      ? {
          type,
          tracking: "unit",
          units: units.filter((piece) => piece.typeId === type.id),
        }
      : {
          type,
          tracking: "quantity",
          stock: stocks.find((row) => row.typeId === type.id) ?? {
            typeId: type.id,
            typeName: type.name,
            branchId,
            quantity: 0,
            damaged: 0,
            usable: 0,
          },
        },
  );

/** «4 unidades» or «12 en total» beside the section's name. */
export const holdingCount = (holding: TypeHolding) =>
  holding.tracking === "unit"
    ? plural(holding.units.length, "unidad", "unidades")
    : `${holding.stock.quantity} en total`;

/** Quitar tipo waits until this Branch holds none of it. */
export const holdsNone = (holding: TypeHolding) =>
  holding.tracking === "unit"
    ? holding.units.length === 0
    : holding.stock.quantity === 0;

export const statusPills = {
  working: { tone: "exito", label: "Funciona" },
  faulty: { tone: "advertencia", label: "Con falla" },
  out_of_service: { tone: "error", label: "Fuera de servicio" },
} as const satisfies Record<
  EquipmentDto["status"],
  { tone: "exito" | "advertencia" | "error"; label: string }
>;
