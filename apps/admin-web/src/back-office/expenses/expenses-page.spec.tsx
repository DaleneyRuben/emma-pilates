import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { centro, equipetrol } from "../../test/booking-handlers";
import {
  categoriesHandler,
  expensePage,
  expenseRow,
  expensesPath,
  maintenanceSeptember,
  repair,
  repairSeptember,
} from "../../test/expense-fixtures";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";

const reads: URLSearchParams[] = [];
const expenseTable = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(expensesPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    return respond(params);
  });

const heading = () =>
  screen.findByRole("heading", { level: 1, name: "Gastos" });
const rowOf = async (name: string) =>
  (await screen.findByRole("cell", { name: new RegExp(name) }))
    .parentElement as HTMLElement;

describe("AW13 Gastos on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers());
    server.use(categoriesHandler());
  });

  it("lists the selected Branch's Expenses with their category, amount, and date", async () => {
    server.use(
      expenseTable(() =>
        jsonResponse(expensePage([repairSeptember, maintenanceSeptember])),
      ),
    );
    renderAdmin("/back-office/gastos");
    await heading();

    expect(screen.getByText("Cargando gastos…")).toBeInTheDocument();
    const row = await rowOf("Reparación");
    const amount = within(row).getByRole("cell", { name: "Bs 450,50" });
    expect(amount).toHaveAttribute("data-label", "Monto");
    expect(amount).toHaveClass("md:text-right");
    expect(within(row).getByRole("cell", { name: "15/09/2026" })).toBeVisible();
    expect(
      within(await rowOf("Mantenimiento")).getByText("Bs 1.200,00"),
    ).toBeVisible();
    expect(screen.getByText("Sucursal Centro")).toBeVisible();
    expect(screen.getByText("Mostrando 1–2 de 2 gastos")).toBeVisible();
    expect(screen.getByRole("button", { name: "Nuevo gasto" })).toBeVisible();
    expect(reads[0]?.get("branchId")).toBe(centro.id);
    expect(reads[0]?.has("expenseCategoryId")).toBe(false);
  });

  it("filters by one category in the address", async () => {
    server.use(
      expenseTable((params) =>
        jsonResponse(
          expensePage(
            params.get("expenseCategoryId") === repair.id
              ? [repairSeptember]
              : [repairSeptember, maintenanceSeptember],
          ),
        ),
      ),
    );
    const { router, user } = renderAdmin("/back-office/gastos");
    await rowOf("Mantenimiento");

    const filter = screen.getByLabelText("Categoría");
    expect(
      within(filter)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["Todas", "Limpieza", "Mantenimiento", "Reparación"]);
    await user.selectOptions(filter, repair.id);

    await screen.findByText("Mostrando 1–1 de 1 gasto");
    expect(reads.at(-1)?.get("expenseCategoryId")).toBe(repair.id);
    expect(router.state.matches.at(-1)?.search).toEqual({
      page: 1,
      pageSize: 20,
      expenseCategoryId: repair.id,
    });
  });

  it("reads the Branch the selector names", async () => {
    server.use(
      expenseTable((params) =>
        jsonResponse(
          expensePage(
            params.get("branchId") === equipetrol.id
              ? [expenseRow("09", repair, 9_900, "2026-09-10", equipetrol.id)]
              : [repairSeptember],
          ),
        ),
      ),
    );
    const { user } = renderAdmin("/back-office/gastos");
    await rowOf("Reparación");

    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Sucursal" })).getByRole(
        "option",
        { name: /Equipetrol/ },
      ),
    );
    expect(await screen.findByText("Bs 99,00")).toBeVisible();
    expect(screen.getByText("Sucursal Equipetrol")).toBeVisible();
    expect(reads.at(-1)?.get("branchId")).toBe(equipetrol.id);
  });

  it("says when the Branch has no Expenses, in all or in one category", async () => {
    server.use(expenseTable(() => jsonResponse(expensePage([]))));
    const { user } = renderAdmin("/back-office/gastos");
    expect(
      await screen.findByText("Todavía no hay gastos en esta sucursal."),
    ).toBeVisible();

    await user.selectOptions(screen.getByLabelText("Categoría"), repair.id);
    expect(
      await screen.findByText(
        "No hay gastos de esta categoría en esta sucursal.",
      ),
    ).toBeVisible();
  });

  it("offers a retry when the Expenses cannot load", async () => {
    server.use(expenseTable(() => problemResponse(500, "unexpected_error")));
    renderAdmin("/back-office/gastos");
    expect(
      await screen.findByText(
        "No pudimos cargar los gastos.",
        {},
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });

  it("hides the Expenses and their action from someone who lost access", async () => {
    server.use(
      expenseTable(() => problemResponse(403, "back_office_access_denied")),
    );
    renderAdmin("/back-office/gastos");
    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Nuevo gasto" }),
    ).not.toBeInTheDocument();
  });
});

describe("AW13 Gastos on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => {
    server.use(...signedInHandlers());
    server.use(categoriesHandler());
  });

  it("labels each card's cells", async () => {
    server.use(
      expenseTable(() => jsonResponse(expensePage([repairSeptember]))),
    );
    renderAdmin("/back-office/gastos");
    const row = await rowOf("Reparación");
    expect(
      within(row).getByRole("cell", { name: "15/09/2026" }),
    ).toHaveAttribute("data-label", "Fecha");
  });
});
