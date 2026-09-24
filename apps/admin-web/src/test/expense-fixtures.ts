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
});

export const repairSeptember = expenseRow("01", repair, 45_050, "2026-09-15");
export const maintenanceSeptember = expenseRow(
  "02",
  maintenance,
  120_000,
  "2026-09-02",
);

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

// AW15's list and AW14's Categoría choice read every Expense Category.
export const categoriesHandler = (
  categories: () => AdminExpenseCategoryDto[] = () => [
    cleaning,
    maintenance,
    repair,
  ],
) => http.get(apiUrl(expenseCategoriesPath), () => jsonResponse(categories()));
