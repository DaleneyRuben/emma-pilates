import {
  createExpenseCategory,
  deleteExpenseCategory,
  getListAdminExpenseCategoriesQueryKey,
  getListAdminExpensesQueryKey,
  listAdminExpenseCategories,
  listAdminExpenses,
  recordExpense,
  updateExpense,
  type AdminExpenseCategoryDto,
  type AdminExpenseDto,
  type AdminExpensePageDto,
  type ExpenseChangeDto,
  type ExpenseInputDto,
  type ListAdminExpensesParams,
} from "@pilates/api-contracts";
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { adminFetch } from "../../api/fetcher";
import { idempotencyHeaders } from "../../api/idempotency-key";
import {
  refreshAfterCategoryChange,
  refreshAfterExpense,
} from "../back-office-cache";
import type { ExpenseSearch } from "./expense-search";

// ADR-0042: the key names the Branch, so another Branch's Expenses never
// show and a change refreshes only its own Branch.
export const expenseTableQueryOptions = (
  branchId: string,
  search: ExpenseSearch,
) => {
  const params: ListAdminExpensesParams = {
    branchId,
    page: search.page,
    pageSize: search.pageSize,
    ...(search.expenseCategoryId === undefined
      ? {}
      : { expenseCategoryId: search.expenseCategoryId }),
  };
  return queryOptions({
    queryKey: getListAdminExpensesQueryKey(params),
    queryFn: async ({ signal }) =>
      (await listAdminExpenses(params, { signal }, adminFetch))
        .data as AdminExpensePageDto,
    placeholderData: keepPreviousData,
  });
};

// Studio-wide labels (BKO-001 D13), a handful, answered as one list.
export const expenseCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: getListAdminExpenseCategoriesQueryKey(),
    queryFn: async ({ signal }) =>
      (await listAdminExpenseCategories({ signal }, adminFetch))
        .data as AdminExpenseCategoryDto[],
  });

type ExpenseChange =
  | { kind: "record"; input: ExpenseInputDto; idempotencyKey: string }
  | { kind: "correct"; expenseId: string; input: ExpenseChangeDto };

// AW14: record an Expense once per Idempotency-Key or correct one; the
// Branch never changes (BKO-001 D11) and both are audited (D17).
export function useExpenseChange(branchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (change: ExpenseChange): Promise<AdminExpenseDto> =>
      (change.kind === "record"
        ? await recordExpense(
            change.input,
            idempotencyHeaders(change.idempotencyKey),
            adminFetch,
          )
        : await updateExpense(
            change.expenseId,
            change.input,
            undefined,
            adminFetch,
          )
      ).data as AdminExpenseDto,
    onSuccess: () => refreshAfterExpense(queryClient, { branchId }),
  });
}

type CategoryChange =
  | { kind: "create"; name: string }
  | { kind: "delete"; expenseCategoryId: string };

// AW15 and AW14's inline row: add a label, or delete one no Expense uses.
export function useCategoryChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      change: CategoryChange,
    ): Promise<AdminExpenseCategoryDto | null> => {
      if (change.kind === "create") {
        return (
          await createExpenseCategory(
            { name: change.name },
            undefined,
            adminFetch,
          )
        ).data as AdminExpenseCategoryDto;
      }
      await deleteExpenseCategory(
        change.expenseCategoryId,
        undefined,
        adminFetch,
      );
      return null;
    },
    onSettled: () => refreshAfterCategoryChange(queryClient),
  });
}
