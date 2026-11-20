import type { MonthResultDto } from "@pilates/api-contracts";
import { http } from "msw";
import { branchesPath, centro, equipetrol, page } from "./booking-handlers";
import { apiUrl, jsonResponse } from "./msw";
import {
  centroExpenses,
  centroIncome,
  expenseReportPath,
  incomeReportPath,
  monthResultPath,
  revenueReportPath,
  seededMonthResult,
  studioExpenses,
  studioIncome,
  urubo,
} from "./report-fixtures";

// Every request the Dinero page made, for the specs to read back.
export const incomeReads: URLSearchParams[] = [];
export const expenseReads: URLSearchParams[] = [];

export const clearReportReads = () => {
  incomeReads.length = 0;
  expenseReads.length = 0;
};

/** AW16's endpoints: both halves of the report, the revenue, the month's finance, and every Branch. */
export const reportHandlers = (
  income: (params: URLSearchParams) => Response = (params) =>
    jsonResponse(params.has("branchId") ? centroIncome : studioIncome),
  expenses: (params: URLSearchParams) => Response = (params) =>
    jsonResponse(params.has("branchId") ? centroExpenses : studioExpenses),
  finance: (month: string) => MonthResultDto = seededMonthResult,
) => [
  http.get(apiUrl(incomeReportPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    incomeReads.push(params);
    return income(params);
  }),
  http.get(apiUrl(expenseReportPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    expenseReads.push(params);
    return expenses(params);
  }),
  http.get(apiUrl(revenueReportPath), () =>
    jsonResponse({
      month: "2026-10",
      cashCentavos: 30_000,
      accruedCentavos: 12_000,
      deferredCentavos: 18_000,
      classesStillOwed: 5,
    }),
  ),
  http.get(apiUrl(monthResultPath), ({ request }) =>
    jsonResponse(
      finance(new URL(request.url).searchParams.get("month") ?? "2026-09"),
    ),
  ),
  // The report's own selector also offers archived Branches (their history).
  http.get(apiUrl(branchesPath), ({ request }) =>
    new URL(request.url).searchParams.get("status") === "all"
      ? jsonResponse(page([centro, equipetrol, urubo], { pageSize: 100 }))
      : undefined,
  ),
];
