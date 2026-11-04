import { http } from "msw";
import { feedbackPage, feedbackPath } from "./feedback-fixtures";
import { apiUrl, jsonResponse } from "./msw";
import { incomeReportPath } from "./report-fixtures";

export const freezesPath = "/api/v1/administrator/freezes";
export const payStatementsPath = "/api/v1/administrator/pay-statements";
export const recommendationsPath = "/api/v1/administrator/recommendations";
export const kpisPath = "/api/v1/administrator/reports/kpis";

export const emptyIncome = (cash = 0, transfer = 0) => ({
  from: "2026-11-03T04:00:00.000Z",
  until: "2026-11-04T04:00:00.000Z",
  branchId: null,
  totalCentavos: cash + transfer,
  listPriceCentavos: cash + transfer,
  discountCentavos: 0,
  byMethod: { cash, transfer, credit_only: 0 },
  byKind: { plan: cash + transfer, evaluation: 0 },
  months: [],
  sales: [],
  generatedAt: "2026-11-03T14:00:00.000Z",
  voided: [],
});

// P01 (WEB-043): Inicio is where a session lands, so every spec signed in
// as the Administrator answers its reads with nothing waiting.
export const homeHandlers = () => [
  http.get(apiUrl(freezesPath), () => jsonResponse([])),
  http.get(apiUrl(feedbackPath), () => jsonResponse(feedbackPage([]))),
  http.get(apiUrl(payStatementsPath), () => jsonResponse([])),
  http.get(apiUrl(incomeReportPath), () => jsonResponse(emptyIncome())),
  http.get(apiUrl(recommendationsPath), () =>
    jsonResponse({ month: "2026-11", recommendations: [] }),
  ),
];

// The Coordinator's Inicio reads counts, never money (ADR-0102): Para
// contactar, the requested freezes and the new comments (ADR-0108), and the
// month's KPIs instead of Dinero.
export const coordinatorHomeHandlers = () => [
  http.get(apiUrl(freezesPath), () => jsonResponse([])),
  http.get(apiUrl(feedbackPath), () => jsonResponse(feedbackPage([]))),
  http.get(apiUrl(kpisPath), () =>
    jsonResponse({
      month: "2026-11",
      sessionsHeld: 0,
      occupancyPercent: 0,
      averageStudentsTimes10: 0,
      averageAttendanceTimes10: 0,
      noShowPercent: 0,
      activeClients: 4,
      newClients: 1,
      renewedClients: 1,
      renewalPercent: 50,
    }),
  ),
  http.get(apiUrl(recommendationsPath), () =>
    jsonResponse({ month: "2026-11", recommendations: [] }),
  ),
];
