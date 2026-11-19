import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { centro } from "../../test/booking-handlers";
import {
  categoriesHandler,
  expensePage,
  expenseReportHandler,
  expenseRow,
  expensesPath,
  maintenance,
  repairSeptember,
} from "../../test/expense-fixtures";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const withDetail = { ...repairSeptember, detail: "Cambio de resorte" };
const withoutDetail = expenseRow("02", maintenance, 120_000, "2026-09-02");

// W11 A (owner 2026-11-19): Gastos lists Fecha, Categoría, Detalle, Monto,
// and the form takes an optional detail.
describe("expense detail", () => {
  useMockServer();
  beforeEach(() => {
    server.use(
      ...signedInHandlers(),
      expenseReportHandler(),
      categoriesHandler(),
      http.get(apiUrl(expensesPath), () =>
        jsonResponse(expensePage([withDetail, withoutDetail])),
      ),
    );
  });

  it("shows a «Detalle» column between the category and the amount", async () => {
    renderAdmin("/dinero/gastos");
    const table = await screen.findByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Fecha", "Categoría", "Detalle", "Monto", ""]);
    const rows = within(table).getAllByRole("row");
    expect(within(rows[1]).getByText("Cambio de resorte")).toBeInTheDocument();
    expect(within(rows[2]).getByText("—")).toBeInTheDocument();
  });

  it("records the trimmed detail with a new Expense", async () => {
    let sent: unknown;
    server.use(
      http.post(apiUrl(expensesPath), async ({ request }) => {
        sent = await request.json();
        return jsonResponse(
          { ...expenseRow("05", maintenance, 30_000, "2026-09-22") },
          201,
        );
      }),
    );
    const { user } = renderAdmin("/dinero/gastos");
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Nuevo gasto" }));
    const panel = await screen.findByRole("dialog", { name: "Nuevo gasto" });
    expect(within(panel).getByLabelText("Detalle")).toHaveAccessibleDescription(
      "Opcional. Ej.: Productos de limpieza",
    );
    await user.selectOptions(
      within(panel).getByLabelText("Categoría"),
      maintenance.id,
    );
    await user.type(
      within(panel).getByLabelText("Detalle"),
      "  Productos de limpieza ",
    );
    await user.type(within(panel).getByLabelText("Monto"), "300");
    await user.type(within(panel).getByLabelText("Fecha"), "2026-09-22");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await screen.findByText(
      "Gasto de Bs 300 en Mantenimiento registrado en Centro.",
    );
    expect(sent).toEqual({
      branchId: centro.id,
      expenseCategoryId: maintenance.id,
      amountCentavos: 30_000,
      incurredOn: "2026-09-22",
      detail: "Productos de limpieza",
    });
  });

  it("edits only the detail, and clears it", async () => {
    const updates: unknown[] = [];
    server.use(
      http.put(
        apiUrl(`${expensesPath}/${withDetail.id}`),
        async ({ request }) => {
          updates.push(await request.json());
          return jsonResponse({ ...withDetail, detail: null });
        },
      ),
    );
    const { user } = renderAdmin("/dinero/gastos");
    await user.click(await screen.findByRole("button", { name: "Reparación" }));
    const panel = await screen.findByRole("dialog", { name: "Editar gasto" });
    const detail = within(panel).getByLabelText("Detalle");
    expect(detail).toHaveValue("Cambio de resorte");

    await user.clear(detail);
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await screen.findByText("Guardamos la corrección del gasto de Reparación.");
    expect(updates).toEqual([
      {
        expenseCategoryId: withDetail.expenseCategoryId,
        amountCentavos: withDetail.amountCentavos,
        incurredOn: withDetail.incurredOn,
        detail: null,
      },
    ]);
  });
});
