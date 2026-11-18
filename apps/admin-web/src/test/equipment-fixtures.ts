import type {
  EquipmentDto,
  EquipmentIssueDto,
  EquipmentStockDto,
  EquipmentTypeDto,
} from "@pilates/api-contracts";
import { http } from "msw";
import { centro } from "./booking-handlers";
import { apiUrl, jsonResponse } from "./msw";

export const equipmentPath = "/api/v1/administrator/equipment";
export const equipmentIssuesPath = "/api/v1/administrator/equipment-issues";
export const equipmentTypesPath = "/api/v1/administrator/equipment-types";
export const equipmentStocksPath = "/api/v1/administrator/equipment-stocks";

const id = (n: number) =>
  `e9000000-0000-5000-8000-${String(n).padStart(12, "0")}`;

// FIX-067: the three seeded types, then the studio's own, in API order.
export const reformerType: EquipmentTypeDto = {
  id: id(1),
  name: "Reformer",
  tracking: "unit",
  legacyKind: "reformer",
};
export const cadillacType: EquipmentTypeDto = {
  id: id(2),
  name: "Cadillac",
  tracking: "unit",
  legacyKind: "cadillac",
};
export const matType: EquipmentTypeDto = {
  id: id(3),
  name: "Mat",
  tracking: "unit",
  legacyKind: "mat",
};
export const ringsType: EquipmentTypeDto = {
  id: id(5),
  name: "Aros",
  tracking: "quantity",
  legacyKind: null,
};
export const ballsType: EquipmentTypeDto = {
  id: id(4),
  name: "Balones",
  tracking: "quantity",
  legacyKind: null,
};
export const equipmentTypes = [
  reformerType,
  cadillacType,
  matType,
  ringsType,
  ballsType,
];

const typeOf = { reformer: reformerType, cadillac: cadillacType, mat: matType };

export const piece = (
  kind: "reformer" | "cadillac" | "mat",
  number: number,
  extra: Partial<EquipmentDto> = {},
): EquipmentDto => ({
  id: id({ reformer: 100, cadillac: 200, mat: 300 }[kind] + number),
  branchId: centro.id,
  typeId: typeOf[kind].id,
  typeName: typeOf[kind].name,
  kind,
  number,
  status: "working",
  openIssueCount: 0,
  archivedAt: null,
  ...extra,
});

export const reformer2 = piece("reformer", 2, {
  status: "faulty",
  openIssueCount: 1,
});
export const reformer5 = piece("reformer", 5, {
  status: "out_of_service",
  openIssueCount: 1,
});
// Reformers 1–3 and 5: the first free number is 4.
export const branchEquipment = [
  piece("reformer", 1),
  reformer2,
  piece("reformer", 3),
  reformer5,
  piece("cadillac", 1),
];

export const stock = (
  type: EquipmentTypeDto,
  quantity: number,
  damaged = 0,
): EquipmentStockDto => ({
  typeId: type.id,
  typeName: type.name,
  branchId: centro.id,
  quantity,
  damaged,
  usable: quantity - damaged,
});
export const branchStocks = [stock(ringsType, 0), stock(ballsType, 12, 1)];

const issue = (extra: Partial<EquipmentIssueDto>): EquipmentIssueDto => ({
  id: id(900),
  equipmentId: null,
  equipmentKind: null,
  equipmentNumber: null,
  typeId: reformerType.id,
  typeName: reformerType.name,
  quantity: null,
  writtenOff: false,
  description: "",
  outOfService: false,
  reportedAt: "2026-10-22T12:10:00.000Z",
  reportedByName: "Emma Vargas",
  resolvedAt: null,
  resolvedByName: null,
  ...extra,
});

export const brokenSpring = issue({
  id: id(901),
  equipmentId: reformer5.id,
  equipmentKind: "reformer",
  equipmentNumber: 5,
  description: "El resorte rojo se soltó y la plataforma no frena.",
  outOfService: true,
});
export const wornStrap = issue({
  id: id(902),
  equipmentId: reformer2.id,
  equipmentKind: "reformer",
  equipmentNumber: 2,
  description: "La correa del pie derecho está gastada.",
  reportedAt: "2026-10-21T14:00:00.000Z",
  reportedByName: "Daniela Ortiz",
});
export const flatBall = issue({
  id: id(904),
  typeId: ballsType.id,
  typeName: ballsType.name,
  quantity: 1,
  description: "Uno se pinchó.",
  reportedAt: "2026-10-23T15:00:00.000Z",
  reportedByName: "Daniela Ortiz",
});
export const fixedCable = issue({
  ...brokenSpring,
  id: id(903),
  description: "Cable suelto.",
  resolvedAt: "2026-10-20T14:40:00.000Z",
  resolvedByName: "Paola Mendoza",
});
export const thrownBalls = issue({
  ...flatBall,
  id: id(905),
  quantity: 2,
  description: "Dos se reventaron.",
  writtenOff: true,
  resolvedAt: "2026-10-19T14:40:00.000Z",
  resolvedByName: "Paola Mendoza",
});

export const issuePage = (items: EquipmentIssueDto[]) => ({
  items,
  page: 1,
  pageSize: 100,
  totalItems: items.length,
});

/** The studio's types, the Branch's units and stocks, and its faults. */
export const equipmentHandlers = ({
  types = equipmentTypes,
  items = branchEquipment,
  stocks = branchStocks,
  open = [brokenSpring, wornStrap, flatBall],
  resolved = [fixedCable, thrownBalls],
}: {
  types?: EquipmentTypeDto[];
  items?: EquipmentDto[];
  stocks?: EquipmentStockDto[];
  open?: EquipmentIssueDto[];
  resolved?: EquipmentIssueDto[];
} = {}) => [
  http.get(apiUrl(equipmentTypesPath), () => jsonResponse({ items: types })),
  http.get(apiUrl(equipmentPath), () => jsonResponse({ items })),
  http.get(apiUrl(equipmentStocksPath), () => jsonResponse({ items: stocks })),
  http.get(apiUrl(equipmentIssuesPath), ({ request }) =>
    jsonResponse(
      issuePage(
        new URL(request.url).searchParams.get("status") === "resolved"
          ? resolved
          : open,
      ),
    ),
  ),
];
