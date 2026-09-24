import type {
  AdminSupplyDto,
  AdminSupplyPageDto,
} from "@pilates/api-contracts";
import { http } from "msw";
import { centro } from "./booking-handlers";
import { apiUrl, jsonResponse } from "./msw";

export const suppliesPath = "/api/v1/administrator/supplies";
export const withdrawalsPath = "/api/v1/administrator/withdrawals";

export const supplyRow = (
  suffix: string,
  name: string,
  extra: Partial<AdminSupplyDto> = {},
): AdminSupplyDto => ({
  id: `5a000000-0000-5000-8000-0000000000${suffix}`,
  branchId: centro.id,
  name,
  quantityOnHand: 10,
  lowStockThreshold: 3,
  lowStock: false,
  archivedAt: null,
  ...extra,
});

// Alcohol sits exactly at its threshold, the paper below it (BKO-001 D8).
export const alcohol = supplyRow("01", "Alcohol en gel", {
  quantityOnHand: 3,
  lowStock: true,
});
export const detergent = supplyRow("02", "Detergente", { quantityOnHand: 12 });
export const paper = supplyRow("03", "Papel higiénico", {
  quantityOnHand: 2,
  lowStockThreshold: 4,
  lowStock: true,
});

export const supplyPage = (
  items: AdminSupplyDto[],
  extra: Partial<AdminSupplyPageDto> = {},
): AdminSupplyPageDto => ({
  items,
  page: 1,
  pageSize: 20,
  totalItems: items.length,
  lowStockCount: items.filter((supply) => supply.lowStock).length,
  ...extra,
});

/**
 * Every shell page reads the selected Branch's active Supplies as one page of
 * 100: the sidebar's Insumos count, and the Insumo list of Registrar retiro
 * and Registrar reposición. A spec passes Supplies (optionally for one
 * Branch) to show a count or fill the list.
 */
export const branchSuppliesHandler = (
  supplies: AdminSupplyDto[] = [],
  branchId?: string,
) =>
  http.get(apiUrl(suppliesPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    if (params.get("status") !== "active" || params.get("pageSize") !== "100") {
      return undefined;
    }
    if (branchId !== undefined && params.get("branchId") !== branchId) {
      return undefined;
    }
    return jsonResponse(supplyPage(supplies, { pageSize: 100 }));
  });
