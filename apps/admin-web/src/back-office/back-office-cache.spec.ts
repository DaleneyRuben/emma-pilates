import {
  getListAdminSuppliesQueryKey,
  getListAdminWithdrawalsQueryKey,
} from "@pilates/api-contracts";
import { QueryClient } from "@tanstack/react-query";
import { refreshAfterSupplyChange } from "./back-office-cache";

const centro = "0b6f6f2e-1d38-5a52-9d44-7a0cf0a1c001";
const equipetrol = "0b6f6f2e-1d38-5a52-9d44-7a0cf0a1c002";

const supplyKeys = {
  centroTable: getListAdminSuppliesQueryKey({
    branchId: centro,
    status: "active",
    page: 1,
    pageSize: 20,
  }),
  centroList: getListAdminSuppliesQueryKey({
    branchId: centro,
    status: "active",
    page: 1,
    pageSize: 100,
  }),
  centroEvery: getListAdminSuppliesQueryKey({
    branchId: centro,
    status: "all",
    page: 1,
    pageSize: 100,
  }),
  centroHistory: getListAdminWithdrawalsQueryKey({
    branchId: centro,
    month: "2026-09",
    page: 1,
    pageSize: 20,
  }),
  equipetrolList: getListAdminSuppliesQueryKey({
    branchId: equipetrol,
    status: "active",
    page: 1,
    pageSize: 100,
  }),
  equipetrolHistory: getListAdminWithdrawalsQueryKey({
    branchId: equipetrol,
    month: "2026-09",
    page: 1,
    pageSize: 20,
  }),
  branches: ["/api/v1/administrator/branches", { status: "active" }],
} as const;

const seeded = (keys: Record<string, readonly unknown[]>) => {
  const queryClient = new QueryClient();
  for (const key of Object.values(keys)) queryClient.setQueryData(key, {});
  return queryClient;
};

const invalidated = (
  queryClient: QueryClient,
  keys: Record<string, readonly unknown[]>,
) =>
  Object.entries(keys)
    .filter(([, key]) => queryClient.getQueryState(key)?.isInvalidated)
    .map(([name]) => name)
    .sort();

// ADR-0042: a Back Office change refreshes exactly the cached reads it
// changes, and never another Branch's.
describe("the cache after a Supply change", () => {
  it("refreshes only the Branch's Supply lists for a new Supply", async () => {
    const queryClient = seeded(supplyKeys);
    await refreshAfterSupplyChange(queryClient, {
      branchId: centro,
      kind: "create",
    });
    expect(invalidated(queryClient, supplyKeys)).toEqual([
      "centroEvery",
      "centroList",
      "centroTable",
    ]);
  });

  it.each(["update", "archive", "withdrawal"] as const)(
    "also refreshes the Branch's withdrawal history after a %s",
    async (kind) => {
      const queryClient = seeded(supplyKeys);
      await refreshAfterSupplyChange(queryClient, { branchId: centro, kind });
      expect(invalidated(queryClient, supplyKeys)).toEqual([
        "centroEvery",
        "centroHistory",
        "centroList",
        "centroTable",
      ]);
    },
  );

  it("leaves the withdrawal history alone after a Restock", async () => {
    const queryClient = seeded(supplyKeys);
    await refreshAfterSupplyChange(queryClient, {
      branchId: equipetrol,
      kind: "restock",
    });
    expect(invalidated(queryClient, supplyKeys)).toEqual(["equipetrolList"]);
  });
});
