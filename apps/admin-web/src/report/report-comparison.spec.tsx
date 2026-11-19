import type { ExpenseReportDto, IncomeReportDto } from "@pilates/api-contracts";
import { fireEvent, screen, within } from "@testing-library/react";
import { centro } from "../test/booking-handlers";
import { jsonResponse, server, useMockServer } from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import {
  centroExpenses,
  centroIncome,
  emptyMonthResult,
  studioExpenses,
  studioIncome,
} from "../test/report-fixtures";
import { clearReportReads, reportHandlers } from "../test/report-handlers";
import { signedInHandlers } from "../test/session-handlers";

const august = { from: "2026-08-01T04:00:00.000Z" };
const isAugust = (params: URLSearchParams) =>
  params.get("from") === august.from &&
  params.get("until") === "2026-09-01T04:00:00.000Z";

// September against August: more came in and more went out.
const septemberIncome: IncomeReportDto = {
  ...studioIncome,
  totalCentavos: 150_000,
  byKind: { plan: 145_000, evaluation: 5_000 },
};
const augustIncome: IncomeReportDto = {
  ...studioIncome,
  totalCentavos: 78_000,
  byKind: { plan: 76_000, evaluation: 2_000 },
};
const septemberExpenses: ExpenseReportDto = {
  ...studioExpenses,
  totalCentavos: 398_050,
  expensesCentavos: 48_050,
  salaryPaymentsCentavos: 350_000,
};
const augustExpenses: ExpenseReportDto = {
  ...studioExpenses,
  totalCentavos: 40_000,
  expensesCentavos: 40_000,
  salaryPaymentsCentavos: 0,
};

const byMonth = () =>
  reportHandlers(
    (params) =>
      params.has("branchId")
        ? jsonResponse(centroIncome)
        : jsonResponse(isAugust(params) ? augustIncome : septemberIncome),
    (params) =>
      params.has("branchId")
        ? jsonResponse(centroExpenses)
        : jsonResponse(isAugust(params) ? augustExpenses : septemberExpenses),
  );

const row = (table: HTMLElement, name: string) =>
  within(table).getByRole("cell", { name }).parentElement as HTMLElement;

// FIX-091 (W5 B): the month the range ends in against the month before.
describe("AW16 Reporte month against month", () => {
  useMockServer();
  beforeEach(() => {
    clearReportReads();
    server.use(...signedInHandlers());
  });

  it("compares each concept with the month before and says how much more came in", async () => {
    server.use(...byMonth());
    renderAdmin("/informes/dinero?from=2026-09-01&to=2026-09-30");

    const table = await screen.findByRole("table", { name: "Mes contra mes" });
    expect(
      within(table).getByRole("columnheader", { name: "septiembre de 2026" }),
    ).toBeVisible();
    expect(
      within(table).getByRole("columnheader", { name: "agosto de 2026" }),
    ).toBeVisible();
    const plans = row(table, "Planes vendidos");
    expect(await within(plans).findByText("Bs 1.450")).toBeVisible();
    expect(await within(plans).findByText("Bs 760")).toBeVisible();
    expect(within(row(table, "Evaluaciones")).getByText("Bs 20")).toBeVisible();
    expect(within(row(table, "Sueldos")).getByText("Bs 3.500")).toBeVisible();
    expect(
      within(row(table, "Gastos del estudio")).getByText("Bs 400"),
    ).toBeVisible();
    expect(within(row(table, "Salió")).getByText("Bs 3.980,50")).toBeVisible();
    expect(within(row(table, "Quedó")).getByText("−Bs 2.480,50")).toBeVisible();

    const entered = screen.getByRole("region", { name: "Entró" });
    expect(within(entered).getByText("Bs 1.500")).toBeVisible();
    expect(await within(entered).findByText("+92 % que agosto")).toBeVisible();
  });

  it("leaves the comparison line out of a range longer than a month", async () => {
    server.use(...byMonth());
    renderAdmin("/informes/dinero?from=2026-08-01&to=2026-09-30");

    expect(
      await screen.findByRole("table", { name: "Mes contra mes" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Entró" })).queryByText(
        / que agosto$/,
      ),
    ).toBeNull();
  });

  it("drops the salaries row for one Branch", async () => {
    server.use(...byMonth());
    renderAdmin("/informes/dinero?from=2026-09-01&to=2026-09-30");
    await screen.findByRole("table", { name: "Mes contra mes" });

    fireEvent.change(screen.getByRole("combobox", { name: "Sucursal" }), {
      target: { value: centro.id },
    });

    const table = await screen.findByRole("table", { name: "Mes contra mes" });
    expect(
      await within(table).findAllByRole("cell", { name: "Bs 780" }),
    ).not.toHaveLength(0);
    expect(within(table).queryByRole("cell", { name: "Sueldos" })).toBeNull();
  });

  it("asks for the budget when the month has none to reach the break-even", async () => {
    server.use(
      ...reportHandlers(undefined, undefined, (month) =>
        emptyMonthResult(month),
      ),
    );
    renderAdmin("/informes/dinero?from=2026-09-01&to=2026-09-30");

    const left = await screen.findByRole("region", { name: "Quedó" });
    expect(
      await within(left).findByText(
        "Punto de equilibrio: carga el presupuesto en Finanzas",
      ),
    ).toBeVisible();
  });

  it("leaves the tables of the range below the comparison", async () => {
    server.use(...byMonth());
    renderAdmin("/informes/dinero?from=2026-09-01&to=2026-09-30");

    const table = await screen.findByRole("table", { name: "Mes contra mes" });
    const categories = screen.getByRole("table", {
      name: "Gastos por categoría",
    });
    expect(
      table.compareDocumentPosition(categories) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // The month's accrued revenue moved to the end of the page.
    expect(
      categories.compareDocumentPosition(
        screen.getByRole("region", { name: "Ingreso devengado" }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
