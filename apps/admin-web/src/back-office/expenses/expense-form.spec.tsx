import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { centro } from "../../test/booking-handlers";
import {
  categoriesHandler,
  cleaning,
  expenseCategoriesPath,
  expensePage,
  expenseRow,
  expensesPath,
  maintenance,
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

const uuid = /^[0-9a-f-]{36}$/;
let tableReads = 0;
const expenseTable = () =>
  http.get(apiUrl(expensesPath), () => {
    tableReads += 1;
    return jsonResponse(expensePage([repairSeptember]));
  });

const openCreate = async () => {
  const rendered = renderAdmin("/back-office/gastos");
  await screen.findByRole("cell", { name: /Reparación/ });
  await rendered.user.click(
    screen.getByRole("button", { name: "Nuevo gasto" }),
  );
  const panel = await screen.findByRole("dialog", { name: "Nuevo gasto" });
  return { ...rendered, panel };
};

describe("AW14 Expense form on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    tableReads = 0;
    server.use(...signedInHandlers());
  });

  it("records an Expense at the selected Branch after validating it", async () => {
    const sent: { key: string | null; body: unknown }[] = [];
    server.use(
      categoriesHandler(),
      expenseTable(),
      http.post(apiUrl(expensesPath), async ({ request }) => {
        sent.push({
          key: request.headers.get("idempotency-key"),
          body: await request.json(),
        });
        return jsonResponse(
          expenseRow("05", maintenance, 30_000, "2026-09-22"),
          201,
        );
      }),
    );
    const { panel, user } = await openCreate();
    expect(panel).toHaveAttribute("data-presentation", "side-panel");
    expect(
      within(panel).getByText("Se registra en la sucursal Centro."),
    ).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(
      within(panel).getByLabelText("Categoría"),
    ).toHaveAccessibleDescription("Elige una categoría.");
    expect(within(panel).getByLabelText("Fecha")).toHaveAccessibleDescription(
      "Elige la fecha del gasto.",
    );

    await user.selectOptions(
      within(panel).getByLabelText("Categoría"),
      maintenance.id,
    );
    await user.type(within(panel).getByLabelText("Monto"), "300");
    await user.type(within(panel).getByLabelText("Fecha"), "2026-09-22");
    const readsBefore = tableReads;
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await screen.findByText(
        "Gasto de Bs 300,00 en Mantenimiento registrado en Centro.",
      ),
    ).toBeInTheDocument();
    expect(sent).toEqual([
      {
        key: expect.stringMatching(uuid),
        body: {
          branchId: centro.id,
          expenseCategoryId: maintenance.id,
          amountCentavos: 30_000,
          incurredOn: "2026-09-22",
        },
      },
    ]);
    await waitFor(() => expect(tableReads).toBeGreaterThan(readsBefore));
  });

  it("adds a category inline without leaving the form and chooses it", async () => {
    let categories = [maintenance, repair];
    let created: unknown;
    server.use(
      categoriesHandler(() => categories),
      expenseTable(),
      http.post(apiUrl(expenseCategoriesPath), async ({ request }) => {
        created = await request.json();
        categories = [cleaning, ...categories];
        return jsonResponse(cleaning, 201);
      }),
    );
    const { panel, user } = await openCreate();
    await user.click(
      within(panel).getByRole("button", { name: "Nueva categoría" }),
    );
    const name = within(panel).getByLabelText("Nombre de la categoría");
    await user.click(within(panel).getByRole("button", { name: "Agregar" }));
    expect(name).toHaveAccessibleDescription("Escribe el nombre.");

    await user.type(name, " Limpieza {Enter}");

    await waitFor(() =>
      expect(within(panel).getByLabelText("Categoría")).toHaveValue(
        cleaning.id,
      ),
    );
    expect(created).toEqual({ name: "Limpieza" });
    expect(
      within(panel).queryByLabelText("Nombre de la categoría"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Nuevo gasto" })).toBeVisible();
  });

  it("marks an inline category whose name is taken", async () => {
    server.use(
      categoriesHandler(),
      expenseTable(),
      http.post(apiUrl(expenseCategoriesPath), () =>
        problemResponse(409, "expense_category_name_taken"),
      ),
    );
    const { panel, user } = await openCreate();
    await user.click(
      within(panel).getByRole("button", { name: "Nueva categoría" }),
    );
    await user.type(
      within(panel).getByLabelText("Nombre de la categoría"),
      "reparación",
    );
    await user.click(within(panel).getByRole("button", { name: "Agregar" }));

    await waitFor(() =>
      expect(
        within(panel).getByLabelText("Nombre de la categoría"),
      ).toHaveAccessibleDescription("Ya existe una categoría con ese nombre."),
    );
  });

  it("corrects an Expense from its row but never its Branch", async () => {
    let updated: unknown;
    server.use(
      categoriesHandler(),
      expenseTable(),
      http.put(
        apiUrl(`${expensesPath}/${repairSeptember.id}`),
        async ({ request }) => {
          updated = await request.json();
          return jsonResponse({ ...repairSeptember, amountCentavos: 50_000 });
        },
      ),
    );
    const { user } = renderAdmin("/back-office/gastos");
    await user.click(await screen.findByRole("button", { name: "Reparación" }));
    const panel = await screen.findByRole("dialog", { name: "Editar gasto" });
    expect(within(panel).getByLabelText("Categoría")).toHaveValue(repair.id);
    expect(within(panel).getByLabelText("Monto")).toHaveValue("450,50");
    expect(within(panel).getByLabelText("Fecha")).toHaveValue("15/09/2026");
    expect(
      within(panel).getByText(
        "Sucursal Centro: un gasto no cambia de sucursal.",
      ),
    ).toBeInTheDocument();

    await user.clear(within(panel).getByLabelText("Monto"));
    await user.type(within(panel).getByLabelText("Monto"), "500");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await screen.findByText(
        "Guardamos la corrección del gasto de Reparación.",
      ),
    ).toBeInTheDocument();
    expect(updated).toEqual({
      expenseCategoryId: repair.id,
      amountCentavos: 50_000,
      incurredOn: "2026-09-15",
    });
  });

  it("explains a Branch archived since the page opened", async () => {
    server.use(
      categoriesHandler(),
      expenseTable(),
      http.post(apiUrl(expensesPath), () =>
        problemResponse(409, "branch_archived"),
      ),
    );
    const { panel, user } = await openCreate();
    await user.selectOptions(
      within(panel).getByLabelText("Categoría"),
      repair.id,
    );
    await user.type(within(panel).getByLabelText("Monto"), "10");
    await user.type(within(panel).getByLabelText("Fecha"), "2026-09-01");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await within(panel).findByText(
        "Esta sucursal está archivada: ya no recibe registros nuevos.",
      ),
    ).toBeInTheDocument();
  });
});

describe("AW14 Expense form on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("fills the screen and opens the category adder when none exist yet", async () => {
    server.use(
      categoriesHandler(() => []),
      expenseTable(),
    );
    const { panel } = await openCreate();
    expect(panel).toHaveAttribute("data-presentation", "full-screen");
    expect(
      within(panel).getByLabelText("Nombre de la categoría"),
    ).toBeVisible();
    expect(
      within(panel).getByText("Todavía no hay categorías: crea la primera."),
    ).toBeInTheDocument();
  });
});
