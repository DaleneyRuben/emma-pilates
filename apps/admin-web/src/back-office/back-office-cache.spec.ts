import {
  getGetExpenseReportQueryKey,
  getListAdminExpenseCategoriesQueryKey,
  getListAdminExpensesQueryKey,
  getListAdminSalaryPaymentsQueryKey,
  getListAdminSuppliesQueryKey,
  getListAdminWithdrawalsQueryKey,
  getListStaffMembersQueryKey,
} from "@pilates/api-contracts";
import { QueryClient } from "@tanstack/react-query";
import {
  refreshAfterCategoryChange,
  refreshAfterExpense,
  refreshAfterSalaryPayment,
  refreshAfterSupplyChange,
} from "./back-office-cache";

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

const range = {
  from: "2026-09-01T04:00:00.000Z",
  until: "2026-10-01T04:00:00.000Z",
};
const payrollKeys = {
  payroll: getListAdminSalaryPaymentsQueryKey({ page: 1, pageSize: 20 }),
  emmaPayroll: getListAdminSalaryPaymentsQueryKey({
    page: 1,
    pageSize: 20,
    staffMemberId: "7cde0ef6-5eb1-568d-ace7-938c98ee0a02",
  }),
  studioReport: getGetExpenseReportQueryKey(range),
  centroReport: getGetExpenseReportQueryKey({ ...range, branchId: centro }),
  staff: getListStaffMembersQueryKey({ page: 1, pageSize: 100 }),
  centroList: supplyKeys.centroList,
} as const;

describe("the cache after a Salary Payment", () => {
  it("refreshes the payroll lists and only the all-Branches expense report", async () => {
    const queryClient = seeded(payrollKeys);
    await refreshAfterSalaryPayment(queryClient);
    // Salary Payments are studio-wide and count only without a Branch
    // (CONTEXT-MAP, BKO-001 Q3).
    expect(invalidated(queryClient, payrollKeys)).toEqual([
      "emmaPayroll",
      "payroll",
      "studioReport",
    ]);
  });
});

const expenseKeys = {
  centroExpenses: getListAdminExpensesQueryKey({
    branchId: centro,
    page: 1,
    pageSize: 20,
  }),
  centroRepairs: getListAdminExpensesQueryKey({
    branchId: centro,
    expenseCategoryId: "8c000000-0000-5000-8000-000000000003",
    page: 1,
    pageSize: 20,
  }),
  equipetrolExpenses: getListAdminExpensesQueryKey({
    branchId: equipetrol,
    page: 1,
    pageSize: 20,
  }),
  categories: getListAdminExpenseCategoriesQueryKey(),
  studioReport: payrollKeys.studioReport,
  centroReport: payrollKeys.centroReport,
  equipetrolReport: getGetExpenseReportQueryKey({
    ...range,
    branchId: equipetrol,
  }),
  payroll: payrollKeys.payroll,
} as const;

describe("the cache after an Expense or a category change", () => {
  it("refreshes the Branch's Expenses, the categories in use, and its reports", async () => {
    const queryClient = seeded(expenseKeys);
    await refreshAfterExpense(queryClient, { branchId: centro });
    expect(invalidated(queryClient, expenseKeys)).toEqual([
      "categories",
      "centroExpenses",
      "centroRepairs",
      "centroReport",
      "studioReport",
    ]);
  });

  it("refreshes only the category list after adding or deleting a label", async () => {
    const queryClient = seeded(expenseKeys);
    await refreshAfterCategoryChange(queryClient);
    expect(invalidated(queryClient, expenseKeys)).toEqual(["categories"]);
  });
});
