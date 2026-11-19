import { expect, test } from "@playwright/test";
import { signIn } from "./support/session";

// AW13/AW14 as the representative mutation: an Expense recorded at the
// selected Branch with a category added inline, and Branch scoping after.
// FIX-091 (W11 B): Gastos shows one month, so the walk opens September.
const september = "/dinero/gastos?month=2026-09";
const emptySeptember = "No hay gastos en septiembre de 2026.";
test("records an Expense at Centro with an inline category", async ({
  page,
}) => {
  await signIn(page, september);
  await expect(page.getByText(emptySeptember)).toBeVisible();

  await page.getByRole("button", { name: "Nuevo gasto" }).click();
  const panel = page.getByRole("dialog", { name: "Nuevo gasto" });
  await expect(
    panel.getByText("Se registra en la sucursal Centro."),
  ).toBeVisible();

  // The fixtures hold no category, so the inline row is already open.
  await expect(
    panel.getByText("Todavía no hay categorías: crea la primera."),
  ).toBeVisible();
  await panel.getByLabel("Nombre de la categoría").fill("Mantenimiento");
  await panel.getByLabel("Nombre de la categoría").press("Enter");
  await expect(panel.getByRole("combobox", { name: "Categoría" })).toHaveValue(
    /[0-9a-f-]{36}/,
  );
  await panel.getByLabel("Monto").fill("450,50");
  await panel.getByLabel("Fecha").fill("2026-09-01");
  await panel.getByRole("button", { name: "Guardar" }).click();

  await expect(
    page.getByText("Gasto de Bs 450,50 en Mantenimiento registrado en Centro."),
  ).toBeVisible();
  await expect(panel).toHaveCount(0);
  const row = page.getByRole("row", { name: /Mantenimiento/ });
  await expect(row.getByRole("cell", { name: "Bs 450,50" })).toBeVisible();
  await expect(row.getByRole("cell", { name: "mar 1 sept" })).toBeVisible();
  await expect(page.getByText("Mostrando 1–1 de 1 gasto")).toBeVisible();

  // An Expense belongs to its Branch (BKO-001 D11).
  await page.getByRole("button", { name: "Sucursal Centro" }).click();
  await page
    .getByRole("dialog", { name: "Sucursal" })
    .getByRole("option", { name: /Equipetrol/ })
    .click();
  await expect(page.getByText(emptySeptember)).toBeVisible();
  await expect(page.getByRole("row", { name: /Mantenimiento/ })).toHaveCount(0);
});

// Finding 104: «Eliminar gasto» moves the row to «Ver gastos borrados»
// (FIX-091), marked, and the report stops counting it. The «Editar» action
// names the row it opens.
test("eliminates an Expense and leaves it out of Informes › Dinero", async ({
  page,
}) => {
  const report = "/informes/dinero?from=2026-09-01&to=2026-09-30";
  const categories = page.getByRole("table", { name: "Gastos por categoría" });
  await signIn(page, september);
  await page.getByRole("button", { name: "Nuevo gasto" }).click();
  const create = page.getByRole("dialog", { name: "Nuevo gasto" });
  const adder = create.getByRole("button", { name: "Nueva categoría" });
  if (await adder.isVisible()) await adder.click();
  await create.getByLabel("Nombre de la categoría").fill("Luz");
  await create.getByLabel("Nombre de la categoría").press("Enter");
  await create.getByLabel("Monto").fill("350");
  await create.getByLabel("Fecha").fill("2026-09-03");
  await create.getByRole("button", { name: "Guardar" }).click();
  await expect(create).toHaveCount(0);

  await page.goto(report);
  await expect(categories.getByRole("cell", { name: "Luz" })).toBeVisible();

  await page.goto(september);
  await page.getByRole("button", { name: "Editar el gasto de Luz" }).click();
  const panel = page.getByRole("dialog", { name: "Editar gasto" });
  await panel.getByRole("button", { name: "Eliminar gasto" }).click();
  const confirm = page.getByRole("alertdialog", {
    name: "¿Eliminar este gasto?",
  });
  await confirm.getByLabel("Motivo (opcional)").fill("Cargado dos veces");
  await confirm.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(
    page.getByText("Eliminamos el gasto de Bs 350 en Luz."),
  ).toBeVisible();
  await expect(page.getByRole("row", { name: /Luz/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Ver gastos borrados" }).click();
  await expect(
    page.getByText("Gastos borrados de septiembre de 2026"),
  ).toBeVisible();
  const row = page.getByRole("row", { name: /Luz/ });
  await expect(row.getByText("Eliminado", { exact: true })).toBeVisible();
  await expect(
    row.getByText(/Eliminado por .* · Cargado dos veces/),
  ).toBeVisible();
  await expect(row.getByRole("button")).toHaveCount(0);

  await page.goto(report);
  await expect(categories).toBeVisible();
  await expect(categories.getByRole("cell", { name: "Luz" })).toHaveCount(0);
});
