import type { EquipmentDto, EquipmentIssueDto } from "@pilates/api-contracts";
import { http } from "msw";
import { centro } from "./booking-handlers";
import { apiUrl, jsonResponse } from "./msw";

export const equipmentPath = "/api/v1/administrator/equipment";
export const equipmentIssuesPath = "/api/v1/administrator/equipment-issues";

const id = (n: number) =>
  `e9000000-0000-5000-8000-${String(n).padStart(12, "0")}`;

export const piece = (
  kind: EquipmentDto["kind"],
  number: number,
  extra: Partial<EquipmentDto> = {},
): EquipmentDto => ({
  id: id({ reformer: 100, cadillac: 200, mat: 300 }[kind] + number),
  branchId: centro.id,
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
export const branchEquipment = [
  piece("reformer", 1),
  reformer2,
  reformer5,
  piece("cadillac", 1),
];

export const brokenSpring: EquipmentIssueDto = {
  id: id(901),
  equipmentId: reformer5.id,
  equipmentKind: "reformer",
  equipmentNumber: 5,
  description: "El resorte rojo se soltó y la plataforma no frena.",
  outOfService: true,
  reportedAt: "2026-10-22T12:10:00.000Z",
  reportedByName: "Emma Vargas",
  resolvedAt: null,
  resolvedByName: null,
};
export const wornStrap: EquipmentIssueDto = {
  id: id(902),
  equipmentId: reformer2.id,
  equipmentKind: "reformer",
  equipmentNumber: 2,
  description: "La correa del pie derecho está gastada.",
  outOfService: false,
  reportedAt: "2026-10-21T14:00:00.000Z",
  reportedByName: "Daniela Ortiz",
  resolvedAt: null,
  resolvedByName: null,
};
export const fixedCable: EquipmentIssueDto = {
  ...brokenSpring,
  id: id(903),
  description: "Cable suelto.",
  resolvedAt: "2026-10-20T14:40:00.000Z",
  resolvedByName: "Paola Mendoza",
};

export const issuePage = (items: EquipmentIssueDto[]) => ({
  items,
  page: 1,
  pageSize: 100,
  totalItems: items.length,
});

/** The Branch's Equipment and its open and resolved faults. */
export const equipmentHandlers = (
  items: EquipmentDto[] = branchEquipment,
  open: EquipmentIssueDto[] = [brokenSpring, wornStrap],
  resolved: EquipmentIssueDto[] = [fixedCable],
) => [
  http.get(apiUrl(equipmentPath), () => jsonResponse({ items })),
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
