import type { EquipmentDto } from "@pilates/api-contracts";

export type EquipmentKind = EquipmentDto["kind"];

export const equipmentKinds: readonly (readonly [EquipmentKind, string])[] = [
  ["reformer", "Reformer"],
  ["cadillac", "Cadillac"],
  ["mat", "Mat"],
];

const singular: Record<EquipmentKind, string> = {
  reformer: "Reformer",
  cadillac: "Cadillac",
  mat: "Mat",
};

export const kindPlural: Record<EquipmentKind, string> = {
  reformer: "Reformers",
  cadillac: "Cadillacs",
  mat: "Mats",
};

/** «Reformer 5»: a piece is named by its kind and number. */
export const equipmentName = (kind: EquipmentKind, number: number) =>
  `${singular[kind]} ${number}`;

export const statusPills = {
  working: { tone: "exito", label: "Funciona" },
  faulty: { tone: "advertencia", label: "Con falla" },
  out_of_service: { tone: "error", label: "Fuera de servicio" },
} as const satisfies Record<
  EquipmentDto["status"],
  { tone: "exito" | "advertencia" | "error"; label: string }
>;
