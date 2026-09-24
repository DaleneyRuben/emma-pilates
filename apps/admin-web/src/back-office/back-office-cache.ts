import {
  getListAdminSuppliesQueryKey,
  getListAdminWithdrawalsQueryKey,
} from "@pilates/api-contracts";
import type { QueryClient } from "@tanstack/react-query";
import { isBranchScopedKey } from "../api/branch-scoped-key";

export type SupplyChangeKind =
  "create" | "update" | "archive" | "withdrawal" | "restock";

const suppliesPath = getListAdminSuppliesQueryKey()[0];
const withdrawalsPath = getListAdminWithdrawalsQueryKey()[0];

/**
 * ADR-0042: a Supply change refreshes that Branch's Supply lists (the table,
 * the panels' Insumo list, the sidebar count, AW31's filter). Its withdrawal
 * history changes too when a Withdrawal is added or a Supply renamed or
 * archived; a Restock adds units only, so the history stays.
 */
export async function refreshAfterSupplyChange(
  queryClient: QueryClient,
  change: { branchId: string; kind: SupplyChangeKind },
): Promise<void> {
  const refreshes = [refreshBranchSupplies(queryClient, change.branchId)];
  if (change.kind !== "create" && change.kind !== "restock") {
    refreshes.push(
      queryClient.invalidateQueries({
        predicate: isBranchScopedKey(withdrawalsPath, change.branchId),
      }),
    );
  }
  await Promise.all(refreshes);
}

/** One Branch's Supply lists, e.g. after its stock changed elsewhere. */
export const refreshBranchSupplies = (
  queryClient: QueryClient,
  branchId: string,
): Promise<void> =>
  queryClient.invalidateQueries({
    predicate: isBranchScopedKey(suppliesPath, branchId),
  });
