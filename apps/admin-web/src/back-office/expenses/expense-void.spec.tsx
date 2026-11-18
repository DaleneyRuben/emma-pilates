import { screen, within } from "@testing-library/react";
import { http } from "msw";
import {
  categoriesHandler,
  expensePage,
  expensesPath,
  maintenanceSeptember,
  repairSeptember,
  voidedRepair,
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

const rowOf = async (name: string) =>
  (await screen.findByRole("cell", { name: new RegExp(name) }))
    .parentElement as HTMLElement;

// Finding 104 (owner, 2026-11-18): an Expense can be «eliminado», which keeps
// it listed with who and when and makes it count for nothing; a row says
// plainly that it opens «Editar gasto».
describe("Gastos: editing and eliminating an Expense", () => {
  useMockServer();
  let items = [repairSeptember, maintenanceSeptember];
  let voidBody: unknown;
  beforeEach(() => {
    items = [repairSeptember, maintenanceSeptember];
    voidBody = undefined;
    server.use(...signedInHandlers());
    server.use(
      categoriesHandler(),
      http.get(apiUrl(expensesPath), () => jsonResponse(expensePage(items))),
      http.post(
        apiUrl(`${expensesPath}/${repairSeptember.id}/void`),
        async ({ request }) => {
          voidBody = await request.json();
          items = [voidedRepair, maintenanceSeptember];
          return jsonResponse(voidedRepair);
        },
      ),
    );
  });

  it("gives every active row a visible «Editar» action that opens the panel", async () => {
    const { user } = renderAdmin("/dinero/gastos");
    const row = await rowOf("Reparación");
    const edit = within(row).getByRole("button", {
      name: "Editar el gasto de Reparación del 15/09/2026",
    });
    expect(edit).toHaveTextContent("Editar");
    edit.focus();
    await user.keyboard("{Enter}");
    expect(
      await screen.findByRole("dialog", { name: "Editar gasto" }),
    ).toBeVisible();
  });

  it("eliminates an Expense after confirming, with an optional reason", async () => {
    const { user } = renderAdmin("/dinero/gastos");
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
        /Deja de contar en los totales y en Informes › Dinero/,
      ),
    ).toBeVisible();
    await user.type(
      within(confirm).getByLabelText("Motivo (opcional)"),
      "Cargado dos veces",
    );
    await user.click(within(confirm).getByRole("button", { name: "Eliminar" }));

    expect(
      await screen.findByText(
        "Eliminamos el gasto de Bs 450,50 en Reparación.",
      ),
    ).toBeVisible();
    expect(voidBody).toEqual({ reason: "Cargado dos veces" });
    const row = await rowOf("Eliminado por Paola Mendoza");
    expect(within(row).getByText("Eliminado")).toBeVisible();
  });

  it("sends no reason when none is written", async () => {
    const { user } = renderAdmin("/dinero/gastos");
    await user.click(await screen.findByRole("button", { name: "Reparación" }));
    await user.click(
      within(
        await screen.findByRole("dialog", { name: "Editar gasto" }),
      ).getByRole("button", { name: "Eliminar gasto" }),
    );
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Eliminar",
      }),
    );
    await screen.findByText("Eliminamos el gasto de Bs 450,50 en Reparación.");
    expect(voidBody).toEqual({});
  });

  it("explains an Expense eliminated meanwhile", async () => {
    server.use(
      http.post(apiUrl(`${expensesPath}/${repairSeptember.id}/void`), () =>
        problemResponse(409, "expense_voided"),
      ),
    );
    const { user } = renderAdmin("/dinero/gastos");
    await user.click(await screen.findByRole("button", { name: "Reparación" }));
    await user.click(
      within(
        await screen.findByRole("dialog", { name: "Editar gasto" }),
      ).getByRole("button", { name: "Eliminar gasto" }),
    );
    const confirm = await screen.findByRole("alertdialog");
    await user.click(within(confirm).getByRole("button", { name: "Eliminar" }));
    expect(
      await within(confirm).findByText(
        "Este gasto ya fue eliminado. Cierra el panel y vuelve a abrir la lista.",
      ),
    ).toBeVisible();
  });

  it("keeps an eliminated Expense listed, marked with who and when, and read-only", async () => {
    items = [voidedRepair, maintenanceSeptember];
    const { user } = renderAdmin("/dinero/gastos");
    const row = await rowOf("Reparación");
    expect(within(row).getByText("Eliminado")).toBeVisible();
    expect(
      within(row).getByText(
        "Eliminado por Paola Mendoza · 18/11/2026 · 14:30 · Cargado dos veces",
      ),
    ).toBeVisible();
    expect(within(row).queryByRole("button")).not.toBeInTheDocument();
    await user.click(row);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Mostrando 1–2 de 2 gastos")).toBeVisible();
  });
});

describe("Gastos on a narrow browser: the row actions", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => {
    server.use(...signedInHandlers());
    server.use(
      categoriesHandler(),
      http.get(apiUrl(expensesPath), () =>
        jsonResponse(expensePage([maintenanceSeptember, voidedRepair])),
      ),
    );
  });

  it("keeps «Editar» and the eliminated mark on each card", async () => {
    renderAdmin("/dinero/gastos");
    expect(
      await screen.findByRole("button", {
        name: "Editar el gasto de Mantenimiento del 02/09/2026",
      }),
    ).toBeVisible();
    expect(screen.getByText("Eliminado")).toBeVisible();
  });
});
