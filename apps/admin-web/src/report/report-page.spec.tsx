import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import {
  boliviaInstant,
  boliviaToday,
  formatCivilDate,
} from "../lib/bolivia-time";
import {
  branchesPath,
  centro,
  equipetrol,
  page,
} from "../test/booking-handlers";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import {
  centroExpenses,
  centroIncome,
  emptyExpenses,
  emptyIncome,
  expenseReportPath,
  incomeReportPath,
  revenueReportPath,
  studioExpenses,
  studioIncome,
  urubo,
} from "../test/report-fixtures";
import { signedInHandlers } from "../test/session-handlers";
import { useNarrowViewport } from "../test/viewport";
import { defaultReportRange } from "./report-range";

const incomeReads: URLSearchParams[] = [];
const expenseReads: URLSearchParams[] = [];
const reports = (
  income: (params: URLSearchParams) => Response = (params) =>
    jsonResponse(params.has("branchId") ? centroIncome : studioIncome),
  expenses: (params: URLSearchParams) => Response = (params) =>
    jsonResponse(params.has("branchId") ? centroExpenses : studioExpenses),
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
  // The report's own selector also offers archived Branches (their history).
  http.get(apiUrl(branchesPath), ({ request }) =>
    new URL(request.url).searchParams.get("status") === "all"
      ? jsonResponse(page([centro, equipetrol, urubo], { pageSize: 100 }))
      : undefined,
  ),
];

const path = "/reporte?from=2026-08-01&to=2026-09-30";
const heading = () =>
  screen.findByRole("heading", {
    level: 1,
    name: "Reporte de ingresos y gastos",
  });
const tile = (name: string) => screen.getByRole("region", { name });

describe("AW16 Reporte on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    incomeReads.length = 0;
    expenseReads.length = 0;
    server.use(...signedInHandlers());
  });

  it("opens on every Branch with income, expenses with payroll, and their net", async () => {
    server.use(...reports());
    renderAdmin(path);
    await heading();

    expect(screen.getByText("Cargando el reporte…")).toBeInTheDocument();
    expect(
      await within(
        await screen.findByRole("region", { name: "Ingresos" }),
      ).findByText("Bs 2.280,00"),
    ).toBeVisible();
    expect(
      within(tile("Ingresos")).getByText("Pagos confirmados en el rango"),
    ).toBeVisible();
    expect(
      within(tile("Ingresos")).getByText(
        "Efectivo Bs 780,00 · Transferencias Bs 1.500,00",
      ),
    ).toBeVisible();
    expect(
      within(tile("Ingresos")).getByText(
        "Planes Bs 2.210,00 · Evaluaciones Bs 70,00",
      ),
    ).toBeVisible();
    expect(within(tile("Gastos")).getByText("Bs 4.380,50")).toBeVisible();
    expect(
      within(tile("Gastos")).getByText(
        "Nómina más los gastos de cada sucursal",
      ),
    ).toBeVisible();
    expect(within(tile("Neto")).getByText("−Bs 2.100,50")).toBeVisible();
    const accrued = screen.getByRole("region", { name: "Ingreso devengado" });
    expect(
      within(accrued).getByRole("region", { name: "Caja" }),
    ).toHaveTextContent("Bs 300,00");
    expect(
      within(accrued).getByRole("region", { name: "Devengado" }),
    ).toHaveTextContent("Bs 120,00");
    expect(
      within(accrued).getByRole("region", { name: "Diferido" }),
    ).toHaveTextContent("Bs 180,00");
    expect(
      within(accrued).getByText("Clases pendientes de dar hoy: 5"),
    ).toBeVisible();
    expect(
      screen.getByText("01/08/2026 – 30/09/2026 · Todas las sucursales"),
    ).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Sucursal" })).toHaveValue(
      "all",
    );
    expect(
      screen.queryByText(/La nómina y los ingresos por transferencia/),
    ).toBeNull();

    const categories = screen.getByRole("table", {
      name: "Gastos por categoría",
    });
    const payroll = within(categories).getByRole("cell", { name: /Nómina/ })
      .parentElement as HTMLElement;
    expect(
      within(payroll).getByText("Viene de Nómina, no de las categorías"),
    ).toBeVisible();
    expect(
      within(payroll).getByRole("cell", { name: "Bs 3.500,00" }),
    ).toHaveClass("md:text-right");
    expect(
      within(categories).getByRole("cell", { name: "Reparación" }),
    ).toBeVisible();
    const total = within(categories).getByRole("cell", {
      name: "Total de gastos",
    }).parentElement as HTMLElement;
    expect(within(total).getByText("Bs 4.380,50")).toBeVisible();

    const months = screen.getByRole("table", { name: "Totales por mes" });
    const september = within(months).getByRole("cell", {
      name: "septiembre de 2026",
    }).parentElement as HTMLElement;
    expect(
      within(september).getByRole("cell", { name: "Bs 1.500,00" }),
    ).toHaveAttribute("data-label", "Ingresos");
    expect(
      within(september).getByRole("cell", { name: "Bs 3.980,50" }),
    ).toHaveAttribute("data-label", "Gastos");
    expect(
      within(september).getByRole("cell", { name: "−Bs 2.480,50" }),
    ).toHaveAttribute("data-label", "Neto");

    expect(Object.fromEntries(incomeReads[0] ?? [])).toEqual({
      from: "2026-08-01T04:00:00.000Z",
      until: "2026-10-01T04:00:00.000Z",
    });
    expect(Object.fromEntries(expenseReads[0] ?? [])).toEqual({
      from: "2026-08-01T04:00:00.000Z",
      until: "2026-10-01T04:00:00.000Z",
    });
  });

  it("counts only a Branch's cash and Expenses, without payroll, when one is chosen", async () => {
    server.use(...reports());
    const { router } = renderAdmin(path);
    await within(
      await screen.findByRole("region", { name: "Ingresos" }),
    ).findByText("Bs 2.280,00");

    fireEvent.change(screen.getByRole("combobox", { name: "Sucursal" }), {
      target: { value: centro.id },
    });

    // Switching scope shows the loading line, then the new tiles.
    expect(
      await screen.findByText("Pagos en efectivo cobrados en Centro"),
    ).toBeVisible();
    expect(within(tile("Ingresos")).getByText("Bs 780,00")).toBeVisible();
    expect(within(tile("Gastos")).getByText("Bs 480,50")).toBeVisible();
    expect(
      within(tile("Gastos")).getByText("Gastos registrados en Centro"),
    ).toBeVisible();
    expect(within(tile("Neto")).getByText("Bs 299,50")).toBeVisible();
    expect(
      screen.getByText(
        "La nómina y los ingresos por transferencia se ven solo en «Todas las sucursales».",
      ),
    ).toBeVisible();
    const categories = screen.getByRole("table", {
      name: "Gastos por categoría",
    });
    expect(within(categories).queryByText(/Nómina/)).toBeNull();
    expect(incomeReads.at(-1)?.get("branchId")).toBe(centro.id);
    expect(expenseReads.at(-1)?.get("branchId")).toBe(centro.id);
    expect(router.state.matches.at(-1)?.search).toEqual({
      branch: centro.id,
      from: "2026-08-01",
      to: "2026-09-30",
      vista: "reporte",
    });
    expect(
      screen.getByText("01/08/2026 – 30/09/2026 · Sucursal Centro"),
    ).toBeVisible();
  });

  it("offers archived Branches for their history", async () => {
    server.use(...reports());
    renderAdmin(path);
    await heading();

    const selector = screen.getByRole("combobox", { name: "Sucursal" });
    expect(
      await within(selector).findByRole("option", {
        name: "Urubó (archivada)",
      }),
    ).toBeInTheDocument();
    expect(within(selector).getAllByRole("option")[0]).toHaveTextContent(
      "Todas las sucursales",
    );
  });

  it("returns to every Branch when the address names a Branch the studio does not have", async () => {
    server.use(...reports());
    const { router } = renderAdmin(
      `${path}&branch=0b6f6f2e-1d38-5a52-9d44-7a0cf0a1c099`,
    );
    await heading();

    await waitFor(() =>
      expect(router.state.matches.at(-1)?.search).toMatchObject({
        branch: "all",
      }),
    );
    expect(
      await screen.findByText("01/08/2026 – 30/09/2026 · Todas las sucursales"),
    ).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Sucursal" })).toHaveValue(
      "all",
    );
  });

  it("opens on the last six Bolivia months when the address names no range", async () => {
    server.use(...reports());
    renderAdmin("/reporte");
    await heading();

    const range = defaultReportRange(boliviaToday());
    await waitFor(() => expect(incomeReads).toHaveLength(1));
    expect(incomeReads[0]?.get("from")).toBe(
      boliviaInstant(range.from, "00:00"),
    );
    expect(screen.getByLabelText("Desde")).toHaveValue(
      formatCivilDate(range.from),
    );
    expect(screen.getByLabelText("Hasta")).toHaveValue(
      formatCivilDate(range.to),
    );
  });

  it("keeps a new range in the address and refuses one that ends before it starts", async () => {
    server.use(...reports());
    const { router } = renderAdmin(path);
    await within(
      await screen.findByRole("region", { name: "Ingresos" }),
    ).findByText("Bs 2.280,00");

    fireEvent.change(screen.getByLabelText("Desde"), {
      target: { value: "01/09/2026" },
    });
    await waitFor(() =>
      expect(incomeReads.at(-1)?.get("from")).toBe("2026-09-01T04:00:00.000Z"),
    );
    expect(router.state.matches.at(-1)?.search).toMatchObject({
      from: "2026-09-01",
      to: "2026-09-30",
    });

    const reads = incomeReads.length;
    fireEvent.change(screen.getByLabelText("Hasta"), {
      target: { value: "15/08/2026" },
    });
    expect(
      await screen.findByText(
        "La fecha inicial no puede ser posterior a la final.",
      ),
    ).toBeVisible();
    expect(incomeReads).toHaveLength(reads);
    expect(router.state.matches.at(-1)?.search).toMatchObject({
      to: "2026-09-30",
    });
  });

  it("reads each month's pair of bars aloud and on hover", async () => {
    server.use(...reports());
    const { user } = renderAdmin(path);
    await within(
      await screen.findByRole("region", { name: "Ingresos" }),
    ).findByText("Bs 2.280,00");

    const chart = screen.getByRole("figure", { name: "Mes por mes" });
    expect(within(chart).getByText("Ingresos")).toBeVisible();
    expect(within(chart).getByText("Gastos")).toBeVisible();
    const september = within(chart).getByRole("img", {
      name: "septiembre de 2026: ingresos Bs 1.500,00, gastos Bs 3.980,50",
    });

    await user.hover(september);
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("septiembre de 2026");
    expect(tooltip).toHaveTextContent("Ingresos Bs 1.500,00");
    expect(tooltip).toHaveTextContent("Gastos Bs 3.980,50");
  });

  it("says when nothing came in or went out in the range", async () => {
    server.use(
      ...reports(
        () => jsonResponse(emptyIncome(null)),
        () => jsonResponse(emptyExpenses(null)),
      ),
    );
    renderAdmin(path);

    expect(
      await screen.findByText("Sin ingresos ni gastos en este rango."),
    ).toBeVisible();
    expect(within(tile("Neto")).getByText("Bs 0,00")).toBeVisible();
    expect(screen.queryByRole("figure", { name: "Mes por mes" })).toBeNull();
  });

  it("offers a retry when either half of the report cannot load", async () => {
    server.use(...reports(() => problemResponse(500, "unexpected_error")));
    renderAdmin(path);

    expect(
      await screen.findByText(
        "No pudimos cargar el reporte.",
        {},
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });

  it("tells an Administrator who lost access that the page is not theirs", async () => {
    server.use(
      ...reports(undefined, () =>
        problemResponse(403, "back_office_access_denied"),
      ),
    );
    renderAdmin(path);

    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeInTheDocument();
  });

  it("replaces the shell's Branch selector with a note", async () => {
    server.use(...reports());
    renderAdmin(path);
    await heading();

    expect(
      screen.getByText("El reporte usa su propio filtro de sucursal"),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /^Sucursal/ }),
    ).not.toBeInTheDocument();
  });
});

describe("AW16 Reporte on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("stacks the figures and turns the tables into labelled cards", async () => {
    server.use(...reports());
    renderAdmin(path);

    expect(
      await within(
        await screen.findByRole("region", { name: "Neto" }),
      ).findByText("−Bs 2.100,50"),
    ).toBeVisible();
    const months = screen.getByRole("table", { name: "Totales por mes" });
    expect(
      within(months).getAllByRole("cell", { name: "Bs 1.500,00" })[0],
    ).toHaveAttribute("data-label", "Ingresos");
    expect(screen.getByRole("combobox", { name: "Sucursal" })).toBeVisible();
    expect(
      screen.queryByText("El reporte usa su propio filtro de sucursal"),
    ).toBeNull();
  });
});
