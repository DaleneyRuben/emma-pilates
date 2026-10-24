import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { boliviaMonth } from "../lib/bolivia-time";
import { branchesPath, page } from "../test/booking-handlers";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import {
  emptyExpenses,
  emptyIncome,
  emptyMonthResult,
  expenseReportPath,
  incomeReportPath,
  revenueReportPath,
  emptyRevenueReport,
  monthResultPath,
  openingBudgetPath,
  seededMonthResult,
} from "../test/report-fixtures";
import { signedInHandlers } from "../test/session-handlers";
import { useNarrowViewport } from "../test/viewport";

const reads: string[] = [];
const finance = (
  result: (month: string) => Response = (month) =>
    jsonResponse(seededMonthResult(month)),
) => [
  http.get(apiUrl(revenueReportPath), () => jsonResponse(emptyRevenueReport)),
  http.get(apiUrl(incomeReportPath), () => jsonResponse(emptyIncome(null))),
  http.get(apiUrl(expenseReportPath), () => jsonResponse(emptyExpenses(null))),
  http.get(apiUrl(branchesPath), () =>
    jsonResponse(page([], { pageSize: 100 })),
  ),
  http.get(apiUrl(monthResultPath), ({ request }) => {
    const month = new URL(request.url).searchParams.get("month") ?? "";
    reads.push(month);
    return result(month);
  }),
];

describe("AW16 Finanzas on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers());
  });

  it("keeps the report as the page and opens Finanzas from its tab", async () => {
    server.use(...finance());
    const { user, router } = renderAdmin("/reporte");
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Reporte de ingresos y gastos",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("tab", { name: "Reporte", selected: true }),
    ).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Finanzas" }));

    const income = await screen.findByRole("region", {
      name: "Ingresos en caja",
    });
    expect(within(income).getByText("Bs 2.280,00")).toBeVisible();
    expect(
      within(income).getByText("Pagos confirmados en el mes"),
    ).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Impuesto" })).getByText(
        "Bs 364,80",
      ),
    ).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Impuesto" })).getByText(
        "16 % de los ingresos en caja",
      ),
    ).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "Resultado" })).getByText(
        "−Bs 6.734,80",
      ),
    ).toBeVisible();
    expect(
      within(
        screen.getByRole("region", { name: "Punto de equilibrio" }),
      ).getByText("Bs 25.386,90"),
    ).toBeVisible();
    expect(
      screen.getByText("Costo de la nutricionista Bs 150,00"),
    ).toBeVisible();
    const table = screen.getByRole("table", {
      name: "Presupuesto frente a lo gastado",
    });
    const rent = within(table).getByRole("cell", { name: "Alquiler" })
      .parentElement as HTMLElement;
    expect(within(rent).getAllByText("Bs 8.500,00")).toHaveLength(2);
    expect(
      within(table).getByRole("cell", { name: "Imprevistos (10 %)" }),
    ).toBeVisible();
    expect(router.state.location.search).toEqual(
      expect.objectContaining({ vista: "finanzas" }),
    );
    expect(reads[0]).toBe(boliviaMonth());
    expect(screen.queryByLabelText("Desde")).toBeNull();
  });

  it("offers the opening budget when none is loaded, then shows the lines", async () => {
    let seeded = false;
    server.use(
      ...finance((month) =>
        jsonResponse(
          seeded ? seededMonthResult(month) : emptyMonthResult(month),
        ),
      ),
      http.post(apiUrl(openingBudgetPath), () => {
        seeded = true;
        return jsonResponse({ seeded: true });
      }),
    );
    const { user } = renderAdmin("/reporte?vista=finanzas&month=2026-10");
    expect(await screen.findByText("Aún no hay presupuesto.")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Cargar presupuesto de apertura" }),
    );

    expect(await screen.findByRole("cell", { name: "Alquiler" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Cargar presupuesto de apertura" }),
    ).toBeNull();
  });

  it("steps back a month and keeps it in the address", async () => {
    server.use(...finance());
    const { user, router } = renderAdmin(
      "/reporte?vista=finanzas&month=2026-10",
    );
    await screen.findByRole("region", { name: "Ingresos en caja" });

    await user.click(screen.getByRole("button", { name: "Mes anterior" }));

    await waitFor(() => expect(reads.at(-1)).toBe("2026-09"));
    expect(router.state.location.search).toEqual(
      expect.objectContaining({ vista: "finanzas", month: "2026-09" }),
    );
  });

  it("offers a retry when the month cannot load", async () => {
    server.use(...finance(() => problemResponse(500, "unexpected_error")));
    renderAdmin("/reporte?vista=finanzas");

    expect(
      await screen.findByText("No pudimos cargar las finanzas."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });
});

describe("AW16 Finanzas on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("turns the budget table into labelled cards", async () => {
    server.use(...finance());
    renderAdmin("/reporte?vista=finanzas&month=2026-10");

    const table = await screen.findByRole("table", {
      name: "Presupuesto frente a lo gastado",
    });
    expect(
      within(table).getAllByRole("cell", { name: "Bs 8.500,00" })[0],
    ).toHaveAttribute("data-label", "Presupuesto");
  });
});
