import type {
  AdminExpenseCategoryDto,
  AdminExpenseDto,
  AdminExpensePageDto,
} from "@pilates/api-contracts";
import { http } from "msw";
import { centro } from "./booking-handlers";
import { apiUrl, jsonResponse } from "./msw";

export const expensesPath = "/api/v1/administrator/expenses";
export const expenseCategoriesPath = "/api/v1/administrator/expense-categories";

const category = (
  suffix: string,
  name: string,
  inUse: boolean,
): AdminExpenseCategoryDto => ({
  id: `8c000000-0000-5000-8000-0000000000${suffix}`,
  name,
  inUse,
});

export const cleaning = category("01", "Limpieza", false);
export const maintenance = category("02", "Mantenimiento", true);
export const repair = category("03", "Reparación", true);

export const expenseRow = (
  suffix: string,
  expenseCategory: AdminExpenseCategoryDto,
  amountCentavos: number,
  incurredOn: string,
  branchId = centro.id,
): AdminExpenseDto => ({
  id: `8e000000-0000-5000-8000-0000000000${suffix}`,
  branchId,
  expenseCategoryId: expenseCategory.id,
  expenseCategoryName: expenseCategory.name,
  amountCentavos,
  incurredOn,
  detail: null,
  voidedAt: null,
  voidedByName: null,
  voidReason: null,
});

export const repairSeptember = expenseRow("01", repair, 45_050, "2026-09-15");
export const maintenanceSeptember = expenseRow(
  "02",
  maintenance,
  120_000,
  "2026-09-02",
);

// Finding 104: the same Expense once «eliminado».
export const voidedRepair: AdminExpenseDto = {
  ...repairSeptember,
  voidedAt: "2026-11-18T18:30:00.000Z",
  voidedByName: "Paola Mendoza",
  voidReason: "Cargado dos veces",
};

export const expensePage = (
  items: AdminExpenseDto[],
  extra: Partial<AdminExpensePageDto> = {},
): AdminExpensePageDto => ({
  items,
  page: 1,
  pageSize: 20,
  totalItems: items.length,
  ...extra,
});

export const expenseReportPath = "/api/v1/administrator/reports/expenses";

// FIX-091 (W11 B): the month's totals per category beside the table, read
// from AW16's expense report for the selected Branch.
export const expenseReportHandler = (
  byCategory: {
    category: AdminExpenseCategoryDto;
    totalCentavos: number;
  }[] = [],
  onRead: (params: URLSearchParams) => void = () => undefined,
) =>
  http.get(apiUrl(expenseReportPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    onRead(params);
    const expensesCentavos = byCategory.reduce(
      (sum, row) => sum + row.totalCentavos,
      0,
    );
    return jsonResponse({
      from: params.get("from"),
      until: params.get("until"),
      branchId: params.get("branchId"),
      totalCentavos: expensesCentavos,
      expensesCentavos,
      salaryPaymentsCentavos: 0,
      byCategory: byCategory.map(({ category: row, totalCentavos }) => ({
        expenseCategoryId: row.id,
        expenseCategoryName: row.name,
        totalCentavos,
      })),
      months: [],
      generatedAt: "2026-11-19T12:00:00.000Z",
    });
  });

// AW15's list and AW14's Categoría choice read every Expense Category.
export const categoriesHandler = (
  categories: () => AdminExpenseCategoryDto[] = () => [
    cleaning,
    maintenance,
    repair,
  ],
) => http.get(apiUrl(expenseCategoriesPath), () => jsonResponse(categories()));
