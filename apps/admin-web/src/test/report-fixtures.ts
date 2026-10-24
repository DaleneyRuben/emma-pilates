import type {
  AdminBranchDto,
  ExpenseReportDto,
  IncomeReportDto,
  MonthResultDto,
} from "@pilates/api-contracts";
import { centro } from "./booking-handlers";

export const incomeReportPath = "/api/v1/administrator/reports/income";
export const expenseReportPath = "/api/v1/administrator/reports/expenses";
export const revenueReportPath = "/api/v1/administrator/reports/revenue";

export const emptyRevenueReport = {
  month: "2026-10",
  cashCentavos: 0,
  accruedCentavos: 0,
  deferredCentavos: 0,
  classesStillOwed: 0,
};
export const monthResultPath = "/api/v1/administrator/reports/finance";
export const openingBudgetPath =
  "/api/v1/administrator/reports/finance/opening-budget";

// August–September 2026: Bs 780 cash at Centro in August and a Bs 1.500
// transfer in September; a Bs 400 cleaning at Equipetrol in August, a
// Bs 480,50 repair at Centro and Bs 3.500 of payroll in September.
const range = {
  from: "2026-08-01T04:00:00.000Z",
  until: "2026-10-01T04:00:00.000Z",
  generatedAt: "2026-09-24T15:00:00.000Z",
};

const noDiscount = { listPriceCentavos: 0, discountCentavos: 0, sales: [] };

export const studioIncome: IncomeReportDto = {
  ...range,
  branchId: null,
  totalCentavos: 228_000,
  ...noDiscount,
  byMethod: { cash: 78_000, transfer: 150_000, credit_only: 0 },
  byKind: { plan: 221_000, evaluation: 7_000 },
  months: [
    { month: "2026-08-01", totalCentavos: 78_000 },
    { month: "2026-09-01", totalCentavos: 150_000 },
  ],
  voided: [],
};

const openingLines = [
  ["Alquiler", 850_000],
  ["Coordinadora", 350_000],
  ["Recepción", 340_000],
  ["Luz, agua e internet", 60_000],
  ["Software", 15_000],
  ["Limpieza", 80_000],
  ["Contador", 80_000],
  ["Mantenimiento", 10_000],
  ["Anuncios", 100_000],
  ["Insumos", 40_000],
] as const;

export const emptyMonthResult = (month: string): MonthResultDto => ({
  month: `${month}-01`,
  cashIncomeCentavos: 0,
  taxRatePercent: 16,
  taxCentavos: 0,
  budgetSubtotalCentavos: 0,
  contingencyPercent: 10,
  contingencyCentavos: 0,
  budgetTotalCentavos: 0,
  lines: [],
  nutritionistCostCentavos: 0,
  resultCentavos: 0,
  breakEvenCentavos: 0,
});

export const seededMonthResult = (month: string): MonthResultDto => ({
  month: `${month}-01`,
  cashIncomeCentavos: 228_000,
  taxRatePercent: 16,
  taxCentavos: 36_480,
  budgetSubtotalCentavos: 1_925_000,
  contingencyPercent: 10,
  contingencyCentavos: 192_500,
  budgetTotalCentavos: 2_117_500,
  lines: openingLines.map(([name, budgetCentavos]) => ({
    name,
    budgetCentavos,
    actualCentavos: name === "Alquiler" ? 850_000 : 0,
  })),
  nutritionistCostCentavos: 15_000,
  resultCentavos: 228_000 - 36_480 - 850_000 - 15_000,
  breakEvenCentavos: 2_538_690,
});

export const centroIncome: IncomeReportDto = {
  ...range,
  branchId: centro.id,
  totalCentavos: 78_000,
  ...noDiscount,
  byMethod: { cash: 78_000, transfer: 0, credit_only: 0 },
  byKind: { plan: 78_000, evaluation: 0 },
  months: [{ month: "2026-08-01", totalCentavos: 78_000 }],
  voided: [],
};

export const studioExpenses: ExpenseReportDto = {
  ...range,
  branchId: null,
  totalCentavos: 438_050,
  expensesCentavos: 88_050,
  salaryPaymentsCentavos: 350_000,
  byCategory: [
    {
      expenseCategoryId: "ec000000-0000-5000-8000-000000000001",
      expenseCategoryName: "Reparación",
      totalCentavos: 48_050,
    },
    {
      expenseCategoryId: "ec000000-0000-5000-8000-000000000002",
      expenseCategoryName: "Limpieza",
      totalCentavos: 40_000,
    },
  ],
  months: [
    { month: "2026-08-01", totalCentavos: 40_000 },
    { month: "2026-09-01", totalCentavos: 398_050 },
  ],
};

export const centroExpenses: ExpenseReportDto = {
  ...range,
  branchId: centro.id,
  totalCentavos: 48_050,
  expensesCentavos: 48_050,
  salaryPaymentsCentavos: 0,
  byCategory: [studioExpenses.byCategory[0]!],
  months: [{ month: "2026-09-01", totalCentavos: 48_050 }],
};

export const emptyIncome = (branchId: string | null): IncomeReportDto => ({
  ...range,
  branchId,
  totalCentavos: 0,
  ...noDiscount,
  byMethod: { cash: 0, transfer: 0, credit_only: 0 },
  byKind: { plan: 0, evaluation: 0 },
  months: [],
  voided: [],
});

export const emptyExpenses = (branchId: string | null): ExpenseReportDto => ({
  ...range,
  branchId,
  totalCentavos: 0,
  expensesCentavos: 0,
  salaryPaymentsCentavos: 0,
  byCategory: [],
  months: [],
});

export const urubo: AdminBranchDto = {
  id: "0b6f6f2e-1d38-5a52-9d44-7a0cf0a1c004",
  name: "Urubó",
  address: "Carretera al Urubó, km 3",
  archivedAt: "2026-06-30T16:00:00.000Z",
};
