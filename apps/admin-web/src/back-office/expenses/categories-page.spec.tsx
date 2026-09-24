import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import {
  categoriesHandler,
  cleaning,
  expenseCategoriesPath,
  maintenance,
  repair,
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

const path = "/back-office/categorias-de-gasto";
const heading = () =>
  screen.findByRole("heading", { level: 1, name: "Categorías de gasto" });
const list = () => screen.findByRole("list", { name: "Categorías de gasto" });

describe("AW15 Categorías de gasto on a desktop browser", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers()));

  it("lists the studio's labels and lets only an unused one be deleted", async () => {
    server.use(categoriesHandler());
    renderAdmin(path);
    await heading();

    expect(screen.getByText("Cargando categorías…")).toBeInTheDocument();
    const items = within(await list()).getAllByRole("listitem");
    expect(items.map((item) => item.firstChild?.textContent)).toEqual([
      "Limpieza",
      "Mantenimiento",
      "Reparación",
    ]);
    expect(
      screen.getByRole("button", { name: "Eliminar Limpieza" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Eliminar Reparación" }),
    ).toBeDisabled();
    expect(within(items[2]!).getByText("En uso")).toBeVisible();
    expect(
      screen.getByText(
        "Todo el estudio · agrupan los gastos de cada sucursal en el reporte.",
      ),
    ).toBeVisible();
  });

  it("names the page studio-wide in the Branch selector", async () => {
    server.use(categoriesHandler());
    const { user } = renderAdmin(path);
    await list();
    await user.click(screen.getByRole("button", { name: "Sucursal Centro" }));
    expect(
      within(await screen.findByRole("dialog", { name: "Sucursal" })).getByText(
        "Esta página no se filtra por sucursal — las categorías de gasto son del estudio, no de una sede.",
      ),
    ).toBeInTheDocument();
  });

  it("adds a label from the inline row", async () => {
    let categories = [maintenance, repair];
    let created: unknown;
    server.use(
      categoriesHandler(() => categories),
      http.post(apiUrl(expenseCategoriesPath), async ({ request }) => {
        created = await request.json();
        categories = [cleaning, ...categories];
        return jsonResponse(cleaning, 201);
      }),
    );
    const { user } = renderAdmin(path);
    await list();

    await user.type(
      screen.getByLabelText("Nombre de la categoría"),
      "Limpieza",
    );
    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(
      await screen.findByText("Categoría «Limpieza» agregada."),
    ).toBeInTheDocument();
    expect(created).toEqual({ name: "Limpieza" });
    expect(
      await screen.findByRole("button", { name: "Eliminar Limpieza" }),
    ).toBeEnabled();
    expect(screen.getByLabelText("Nombre de la categoría")).toHaveValue("");
  });

  it("deletes an unused label after asking", async () => {
    let categories = [cleaning, repair];
    server.use(
      categoriesHandler(() => categories),
      http.delete(apiUrl(`${expenseCategoriesPath}/${cleaning.id}`), () => {
        categories = [repair];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderAdmin(path);
    await user.click(
      await screen.findByRole("button", { name: "Eliminar Limpieza" }),
    );
    const dialog = await screen.findByRole("alertdialog", {
      name: "¿Eliminar «Limpieza»?",
    });
    expect(
      within(dialog).getByText(
        "Deja de aparecer al registrar un gasto. Ningún gasto la usa.",
      ),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    expect(
      await screen.findByText("Categoría «Limpieza» eliminada."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Eliminar Limpieza" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("explains a label an Expense started using meanwhile and shows it in use", async () => {
    let categories = [cleaning];
    server.use(
      categoriesHandler(() => categories),
      http.delete(apiUrl(`${expenseCategoriesPath}/${cleaning.id}`), () => {
        categories = [{ ...cleaning, inUse: true }];
        return problemResponse(409, "expense_category_in_use");
      }),
    );
    const { user } = renderAdmin(path);
    await user.click(
      await screen.findByRole("button", { name: "Eliminar Limpieza" }),
    );
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Eliminar",
      }),
    );

    expect(
      await screen.findByText("No puedes eliminarla: un gasto la usa."),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Eliminar Limpieza" }),
      ).toBeDisabled(),
    );
  });

  it("invites the first label when there are none", async () => {
    server.use(categoriesHandler(() => []));
    renderAdmin(path);
    expect(
      await screen.findByText(
        "Todavía no hay categorías. Agrega la primera abajo.",
      ),
    ).toBeVisible();
    expect(screen.getByLabelText("Nombre de la categoría")).toBeVisible();
  });

  it("offers a retry when the labels cannot load", async () => {
    server.use(
      http.get(apiUrl(expenseCategoriesPath), () =>
        problemResponse(500, "unexpected_error"),
      ),
    );
    renderAdmin(path);
    expect(
      await screen.findByText(
        "No pudimos cargar las categorías.",
        {},
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });

  it("hides the labels and the inline row from someone who lost access", async () => {
    server.use(
      http.get(apiUrl(expenseCategoriesPath), () =>
        problemResponse(403, "back_office_access_denied"),
      ),
    );
    renderAdmin(path);
    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Nombre de la categoría")).toBeNull();
  });
});

describe("AW15 Categorías de gasto on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("keeps the list and the inline row usable", async () => {
    server.use(categoriesHandler());
    renderAdmin(path);
    expect(await list()).toBeVisible();
    expect(screen.getByRole("button", { name: "Agregar" })).toBeVisible();
  });
});
