import type {
  AdminSupplyDto,
  AdminSupplyPageDto,
  WithdrawalDto,
  WithdrawalPageDto,
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

// A Supply archived since: its Withdrawals stay in AW31 (BKO-001 D9).
export const wax = supplyRow("04", "Cera", {
  archivedAt: "2026-09-10T15:00:00.000Z",
});

/** AW31's Insumo filter: every Supply the Branch ever had. */
export const everySupplyHandler = (
  supplies = [alcohol, detergent, paper, wax],
) =>
  http.get(apiUrl(suppliesPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    if (params.get("status") !== "all") return undefined;
    return jsonResponse(supplyPage(supplies, { pageSize: 100 }));
  });

export const withdrawalRow = (
  suffix: string,
  supply: AdminSupplyDto,
  quantity: number,
  recordedAt: string,
): WithdrawalDto => ({
  id: `6a000000-0000-5000-8000-0000000000${suffix}`,
  supplyId: supply.id,
  supplyName: supply.name,
  quantity,
  recordedAt,
});

export const withdrawalPage = (
  items: WithdrawalDto[],
  extra: Partial<WithdrawalPageDto> = {},
): WithdrawalPageDto => ({
  month: "2026-09",
  items,
  totals: [],
  page: 1,
  pageSize: 20,
  totalItems: items.length,
  ...extra,
});
