import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { centro } from "../../test/booking-handlers";
import {
  categoriesHandler,
  expensePage,
  expenseRow,
  expenseReportHandler,
  expensesPath,
  maintenance,
  maintenanceSeptember,
  repair,
  repairSeptember,
  voidedRepair,
} from "../../test/expense-fixtures";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { boliviaInstant, boliviaMonth } from "../../lib/bolivia-time";

const reads: URLSearchParams[] = [];
const reportReads: URLSearchParams[] = [];
const expenseTable = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(expensesPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    return respond(params);
  });
const standingOrVoided = () =>
  expenseTable((params) =>
    jsonResponse(
      expensePage(
        params.get("voided") === "true"
          ? [voidedRepair]
          : [repairSeptember, maintenanceSeptember],
      ),
    ),
  );
const totals = () =>
  screen.findByRole("region", { name: /^Total de septiembre/ });

// FIX-091 (W11 B): Gastos by Bolivia month, the month's totals per category
// beside the table, and the eliminated ones apart.
describe("AW13 Gastos by month", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    reportReads.length = 0;
    server.use(...signedInHandlers(), categoriesHandler());
    server.use(
      expenseReportHandler(
        [
          { category: maintenance, totalCentavos: 120_000 },
          { category: repair, totalCentavos: 45_050 },
        ],
        (params) => reportReads.push(params),
      ),
    );
  });

  it("opens on the current Bolivia month, standing Expenses only", async () => {
    server.use(standingOrVoided());
    renderAdmin("/dinero/gastos");
    await screen.findByRole("cell", { name: /Reparación/ });
    const month = boliviaMonth();
    expect(reads[0]?.get("from")).toBe(`${month}-01`);
    expect(reads[0]?.get("voided")).toBe("false");
    expect(reportReads[0]?.get("from")).toBe(
      boliviaInstant(`${month}-01`, "00:00"),
    );
    expect(reportReads[0]?.get("branchId")).toBe(centro.id);
  });

  it("lists the month's dates, categories and amounts in that order", async () => {
    server.use(standingOrVoided());
    renderAdmin("/dinero/gastos?month=2026-09");
    const table = await screen.findByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Fecha", "Categoría", "Monto", ""]);
    expect(reads[0]?.get("from")).toBe("2026-09-01");
    expect(reads[0]?.get("to")).toBe("2026-09-30");
  });

  it("totals the month per category beside the table", async () => {
    server.use(standingOrVoided());
    renderAdmin("/dinero/gastos?month=2026-09");
    const aside = await totals();
    expect(within(aside).getByText("Septiembre")).toBeVisible();
    expect(await within(aside).findByText("Bs 1.650,50")).toBeVisible();
    const lines = within(aside)
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(lines).toEqual(["MantenimientoBs 1.200", "ReparaciónBs 450,50"]);
    expect(reportReads[0]?.get("from")).toBe(
      boliviaInstant("2026-09-01", "00:00"),
    );
    expect(reportReads[0]?.get("until")).toBe(
      boliviaInstant("2026-10-01", "00:00"),
    );
  });

  it("says when the month has no Expenses to total", async () => {
    server.use(expenseTable(() => jsonResponse(expensePage([]))));
    server.use(expenseReportHandler([]));
    renderAdmin("/dinero/gastos?month=2026-09");
    expect(
      await screen.findByText("No hay gastos en septiembre de 2026."),
    ).toBeVisible();
    expect(
      await within(await totals()).findByText("Sin gastos este mes."),
    ).toBeVisible();
  });

  it("steps to the previous month with the arrows", async () => {
    server.use(standingOrVoided());
    const { router, user } = renderAdmin("/dinero/gastos?month=2026-09");
    await screen.findByRole("cell", { name: /Reparación/ });
    await user.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(await screen.findByText("agosto de 2026")).toBeVisible();
    expect(router.state.matches.at(-1)?.search).toMatchObject({
      month: "2026-08",
      page: 1,
    });
    expect(reads.at(-1)?.get("from")).toBe("2026-08-01");
    expect(reads.at(-1)?.get("to")).toBe("2026-08-31");
  });

  it("moves the eliminated Expenses behind «Ver gastos borrados»", async () => {
    server.use(standingOrVoided());
    const { router, user } = renderAdmin("/dinero/gastos?month=2026-09");
    await screen.findByRole("cell", { name: /Mantenimiento/ });
    expect(screen.queryByText("Eliminado")).not.toBeInTheDocument();

    await user.click(
      within(await totals()).getByRole("button", {
        name: "Ver gastos borrados",
      }),
    );
    expect(
      await screen.findByText(/Eliminado por Paola Mendoza/),
    ).toBeVisible();
    expect(reads.at(-1)?.get("voided")).toBe("true");
    expect(
      screen.getByText("Gastos borrados de septiembre de 2026"),
    ).toBeVisible();
    expect(
      screen.queryByRole("cell", { name: /Mantenimiento/ }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: "Volver a los gastos" })[0]!,
    );
    expect(
      await screen.findByRole("cell", { name: /Mantenimiento/ }),
    ).toBeVisible();
    expect(router.state.matches.at(-1)?.search).not.toHaveProperty("borrados");
  });

  it("moves to the month of a new Expense dated in another month", async () => {
    server.use(
      standingOrVoided(),
      http.post(apiUrl(expensesPath), () =>
        jsonResponse(expenseRow("05", maintenance, 30_000, "2026-09-22"), 201),
      ),
    );
    const { user, router } = renderAdmin("/dinero/gastos?month=2026-10");
    await screen.findByRole("cell", { name: /Reparación/ });
    await user.click(screen.getByRole("button", { name: "Nuevo gasto" }));
    const panel = await screen.findByRole("dialog", { name: "Nuevo gasto" });
    await user.selectOptions(
      within(panel).getByLabelText("Categoría"),
      maintenance.id,
    );
    await user.type(within(panel).getByLabelText("Monto"), "300");
    await user.type(within(panel).getByLabelText("Fecha"), "2026-09-22");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await screen.findByText(/registrado en Centro/);
    expect(router.state.matches.at(-1)?.search).toMatchObject({
      month: "2026-09",
    });
  });

  it("says when the month has no eliminated Expenses", async () => {
    server.use(expenseTable(() => jsonResponse(expensePage([]))));
    renderAdmin("/dinero/gastos?month=2026-09&borrados=true");
    expect(
      await screen.findByText("No hay gastos borrados en septiembre de 2026."),
    ).toBeVisible();
  });
});
