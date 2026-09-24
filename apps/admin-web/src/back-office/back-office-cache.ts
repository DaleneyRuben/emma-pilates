import {
  getGetExpenseReportQueryKey,
  getListAdminExpenseCategoriesQueryKey,
  getListAdminExpensesQueryKey,
  getListAdminSalaryPaymentsQueryKey,
  getListAdminSuppliesQueryKey,
  getListAdminWithdrawalsQueryKey,
} from "@pilates/api-contracts";
import type { QueryClient } from "@tanstack/react-query";
import { isBranchScopedKey } from "../api/branch-scoped-key";

export type SupplyChangeKind =
  "create" | "update" | "archive" | "withdrawal" | "restock";

const suppliesPath = getListAdminSuppliesQueryKey()[0];
const withdrawalsPath = getListAdminWithdrawalsQueryKey()[0];
const expenseReportPath = getGetExpenseReportQueryKey()[0];

// AW16's expense half, for every Branch (no branchId) or only one.
const isExpenseReportKey =
  (scope: { branchId?: string }) =>
  ({ queryKey }: { queryKey: readonly unknown[] }): boolean => {
    if (queryKey[0] !== expenseReportPath) return false;
    const branchId = (queryKey[1] as { branchId?: string } | undefined)
      ?.branchId;
    return branchId === undefined || branchId === scope.branchId;
  };

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

/**
 * A Salary Payment changes every payroll page and the all-Branches expense
 * report only: payroll is studio-wide and never counts in a single Branch's
 * report (CONTEXT-MAP, BKO-001 Q3).
 */
export async function refreshAfterSalaryPayment(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: getListAdminSalaryPaymentsQueryKey(),
    }),
    queryClient.invalidateQueries({ predicate: isExpenseReportKey({}) }),
  ]);
}

/**
 * An Expense changes its Branch's Expense pages, that Branch's and the
 * all-Branches expense report, and whether its category is in use (AW15
 * enables the delete icon only for an unused one).
 */
export async function refreshAfterExpense(
  queryClient: QueryClient,
  change: { branchId: string },
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      predicate: isBranchScopedKey(
        getListAdminExpensesQueryKey()[0],
        change.branchId,
      ),
    }),
    queryClient.invalidateQueries({ predicate: isExpenseReportKey(change) }),
    refreshAfterCategoryChange(queryClient),
  ]);
}

/** A label added or deleted changes only the category list. */
export const refreshAfterCategoryChange = (
  queryClient: QueryClient,
): Promise<void> =>
  queryClient.invalidateQueries({
    queryKey: getListAdminExpenseCategoriesQueryKey(),
  });
