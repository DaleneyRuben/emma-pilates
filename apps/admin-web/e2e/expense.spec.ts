import { expect, test } from "@playwright/test";
import { signIn } from "./support/session";

// AW13/AW14 as the representative mutation: an Expense recorded at the
// selected Branch with a category added inline, and Branch scoping after.
test("records an Expense at Centro with an inline category", async ({
  page,
}) => {
  await signIn(page, "/back-office/gastos");
  await expect(
    page.getByText("Todavía no hay gastos en esta sucursal."),
  ).toBeVisible();

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
  await expect(row.getByRole("cell", { name: "01/09/2026" })).toBeVisible();
  await expect(page.getByText("Mostrando 1–1 de 1 gasto")).toBeVisible();

  // An Expense belongs to its Branch (BKO-001 D11).
  await page.getByRole("button", { name: "Sucursal Centro" }).click();
  await page
    .getByRole("dialog", { name: "Sucursal" })
    .getByRole("option", { name: /Equipetrol/ })
    .click();
  await expect(
    page.getByText("Todavía no hay gastos en esta sucursal."),
  ).toBeVisible();
  await expect(page.getByRole("row", { name: /Mantenimiento/ })).toHaveCount(0);
});
