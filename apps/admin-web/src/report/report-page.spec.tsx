import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { centro } from "../test/booking-handlers";
import {
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../test/msw";
import { renderAdmin } from "../test/render-admin";
import { emptyExpenses, emptyIncome } from "../test/report-fixtures";
import {
  clearReportReads,
  expenseReads,
  incomeReads,
  reportHandlers as reports,
} from "../test/report-handlers";
import { signedInHandlers } from "../test/session-handlers";
import { useNarrowViewport } from "../test/viewport";
import { expectBrandedLoading } from "../test/branded-loading";

const path = "/informes/dinero?from=2026-08-01&to=2026-09-30";
const heading = () =>
  screen.findByRole("heading", {
    level: 1,
    name: "Dinero",
  });
const tile = (name: string) => screen.getByRole("region", { name });

describe("AW16 Reporte on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    clearReportReads();
    server.use(...signedInHandlers());
  });

  it("opens on every Branch with income, expenses with payroll, and their net", async () => {
    server.use(...reports());
    renderAdmin(path);
    await heading();

    expect(screen.getAllByRole("status")).toHaveLength(1);
    // The accrued revenue sits at the end now, so the report's own loader
    // is the first one on the page.
    expectBrandedLoading("Cargando el reporte…");
    expect(
      await within(
        await screen.findByRole("region", { name: "Entró" }),
      ).findByText("Bs 2.280"),
    ).toBeVisible();
    expect(
      within(tile("Entró")).getByText("Pagos confirmados en el rango"),
    ).toBeVisible();
    expect(
      within(tile("Entró")).getByText("Efectivo Bs 780 · QR Bs 1.500"),
    ).toBeVisible();
    expect(
      within(tile("Entró")).getByText("Planes Bs 2.210 · Evaluaciones Bs 70"),
    ).toBeVisible();
    expect(within(tile("Salió")).getByText("Bs 4.380,50")).toBeVisible();
    expect(
      within(tile("Salió")).getByText("Nómina más los gastos de cada sucursal"),
    ).toBeVisible();
    expect(within(tile("Quedó")).getByText("−Bs 2.100,50")).toBeVisible();
    expect(
      within(tile("Quedó")).getByText("Ingresos menos gastos"),
    ).toBeVisible();
    // FIX-091 (W5 B): the break-even of the month the range ends in.
    expect(
      await within(tile("Quedó")).findByText(
        "Punto de equilibrio de septiembre: Bs 25.386,90",
      ),
    ).toBeVisible();
    const accrued = screen.getByRole("region", { name: "Ingreso devengado" });
    expect(
      within(accrued).getByRole("region", { name: "Caja" }),
    ).toHaveTextContent("Bs 300");
    expect(
      within(accrued).getByRole("region", { name: "Devengado" }),
    ).toHaveTextContent("Bs 120");
    expect(
      within(accrued).getByRole("region", { name: "Diferido" }),
    ).toHaveTextContent("Bs 180");
    expect(
      within(accrued).getByText("Clases pendientes de dar hoy: 5"),
    ).toBeVisible();
    expect(
      screen.getByText("sáb 1 ago – mié 30 sept · Todas las sucursales"),
    ).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Sucursal" })).toHaveValue(
      "all",
    );
    expect(screen.queryByText(/La nómina y los ingresos por QR/)).toBeNull();

    const categories = screen.getByRole("table", {
      name: "Gastos por categoría",
    });
    const payroll = within(categories).getByRole("cell", { name: /Nómina/ })
      .parentElement as HTMLElement;
    expect(
      within(payroll).getByText("Viene de Nómina, no de las categorías"),
    ).toBeVisible();
    expect(within(payroll).getByRole("cell", { name: "Bs 3.500" })).toHaveClass(
      "md:text-right",
    );
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
      within(september).getByRole("cell", { name: "Bs 1.500" }),
    ).toHaveAttribute("data-label", "Ingresos");
    expect(
      within(september).getByRole("cell", { name: "Bs 3.980,50" }),
    ).toHaveAttribute("data-label", "Gastos");
    expect(
      within(september).getByRole("cell", { name: "−Bs 2.480,50" }),
    ).toHaveAttribute("data-label", "Neto");
    // UX-011: a 1024 px «Totales por mes» must not wrap a month or an amount.
    for (const name of ["septiembre de 2026", "Bs 1.500", "−Bs 2.480,50"]) {
      expect(within(months).getAllByText(name)[0]).toHaveClass(
        "whitespace-nowrap",
      );
    }

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
      await screen.findByRole("region", { name: "Entró" }),
    ).findByText("Bs 2.280");

    fireEvent.change(screen.getByRole("combobox", { name: "Sucursal" }), {
      target: { value: centro.id },
    });

    // Switching scope shows the loading line, then the new tiles.
    expect(
      await screen.findByText("Pagos en efectivo cobrados en Centro"),
    ).toBeVisible();
    expect(within(tile("Entró")).getByText("Bs 780")).toBeVisible();
    expect(within(tile("Salió")).getByText("Bs 480,50")).toBeVisible();
    expect(
      within(tile("Salió")).getByText("Gastos registrados en Centro"),
    ).toBeVisible();
    expect(within(tile("Quedó")).getByText("Bs 299,50")).toBeVisible();
    // The month's finance is the whole studio's, so a Branch has none.
    expect(within(tile("Quedó")).queryByText(/Punto de equilibrio/)).toBeNull();
    expect(
      screen.getByText(
        "La nómina y los ingresos por QR se ven solo en «Todas las sucursales».",
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
      screen.getByText("sáb 1 ago – mié 30 sept · Sucursal Centro"),
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
      await screen.findByText("sáb 1 ago – mié 30 sept · Todas las sucursales"),
    ).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Sucursal" })).toHaveValue(
      "all",
    );
  });

  it("reads each month's pair of bars aloud and on hover", async () => {
    server.use(...reports());
    const { user } = renderAdmin(path);
    await within(
      await screen.findByRole("region", { name: "Entró" }),
    ).findByText("Bs 2.280");

    const chart = screen.getByRole("figure", { name: "Mes por mes" });
    expect(within(chart).getByText("Ingresos")).toBeVisible();
    expect(within(chart).getByText("Gastos")).toBeVisible();
    expect(within(chart).getByText("Bs 0")).toBeVisible();
    expect(within(chart).getByText("Bs 2.500")).toBeVisible();
    expect(within(chart).getByText("Bs 5.000")).toBeVisible();
    const september = within(chart).getByRole("img", {
      name: "septiembre de 2026: ingresos Bs 1.500, gastos Bs 3.980,50",
    });

    await user.hover(september);
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("septiembre de 2026");
    expect(tooltip).toHaveTextContent("Ingresos Bs 1.500");
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
    expect(within(tile("Quedó")).getByText("Bs 0")).toBeVisible();
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
        await screen.findByRole("region", { name: "Quedó" }),
      ).findByText("−Bs 2.100,50"),
    ).toBeVisible();
    const months = screen.getByRole("table", { name: "Totales por mes" });
    expect(
      within(months).getAllByRole("cell", { name: "Bs 1.500" })[0],
    ).toHaveAttribute("data-label", "Ingresos");
    expect(screen.getByRole("combobox", { name: "Sucursal" })).toBeVisible();
    expect(
      screen.queryByText("El reporte usa su propio filtro de sucursal"),
    ).toBeNull();
  });
});
