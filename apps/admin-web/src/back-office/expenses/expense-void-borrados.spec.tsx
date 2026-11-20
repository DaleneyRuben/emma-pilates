import { screen, within } from "@testing-library/react";
import { delay, http } from "msw";
import {
  categoriesHandler,
  expensePage,
  expenseReportHandler,
  expensesPath,
  repairSeptember,
  voidedRepair,
} from "../../test/expense-fixtures";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

// W11 (verification, 2026-11-20): the month's only Expense, once
// eliminated, is under «Ver gastos borrados», and the confirmation says so.
describe("Gastos: an eliminated Expense under «Ver gastos borrados»", () => {
  useMockServer();
  let voided = false;
  beforeEach(() => {
    voided = false;
    server.use(...signedInHandlers(), expenseReportHandler());
    server.use(
      categoriesHandler(),
      http.get(apiUrl(expensesPath), async ({ request }) => {
        const wantsVoided =
          new URL(request.url).searchParams.get("voided") === "true";
        if (wantsVoided) {
          await delay(300);
          return jsonResponse(expensePage(voided ? [voidedRepair] : []));
        }
        return jsonResponse(expensePage(voided ? [] : [repairSeptember]));
      }),
      http.post(apiUrl(`${expensesPath}/${repairSeptember.id}/void`), () => {
        voided = true;
        return jsonResponse(voidedRepair);
      }),
    );
  });

  it("says where the Expense goes and lists it there", async () => {
    const { user } = renderAdmin("/dinero/gastos?month=2026-09");
    await user.click(await screen.findByRole("button", { name: "Reparación" }));
    const panel = await screen.findByRole("dialog", { name: "Editar gasto" });
    await user.click(
      within(panel).getByRole("button", { name: "Eliminar gasto" }),
    );
    const confirm = await screen.findByRole("alertdialog", {
      name: "¿Eliminar este gasto?",
    });
    expect(
      within(confirm).getByText(
        "Deja de contar en los totales y en Informes › Dinero. Sale de la lista y queda en «Ver gastos borrados» del mes, con quién y cuándo, y ya no se puede editar.",
      ),
    ).toBeVisible();
    expect(
      within(confirm).queryByText(/marcado como eliminado/),
    ).not.toBeInTheDocument();
    await user.click(within(confirm).getByRole("button", { name: "Eliminar" }));
    expect(
      await screen.findByText("No hay gastos en septiembre de 2026."),
    ).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Ver gastos borrados" }),
    );

    expect(
      screen.queryByText("No hay gastos borrados en septiembre de 2026."),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByText(/Eliminado por Paola Mendoza/),
    ).toBeVisible();
  });
});
