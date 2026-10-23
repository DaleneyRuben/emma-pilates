import { expect, test } from "@playwright/test";
import { sidebar, signIn } from "./support/session";

// The 420 px variant every admin screen has (design system → Admin Desktop
// Web Responsiveness): drawer, bottom sheet, and one card per row.
test.use({ viewport: { width: 420, height: 860 } });

test("a narrow browser gets the drawer, the bottom-sheet selector, and card rows", async ({
  page,
}) => {
  await signIn(page, "/back-office/personal");
  await expect(sidebar(page)).toHaveCount(0);

  await page.getByRole("button", { name: "Abrir menú" }).click();
  const drawer = page.getByRole("dialog", { name: "Menú" });
  await expect(drawer.getByRole("link", { name: "Horario" })).toBeVisible();
  await drawer.getByRole("link", { name: "Gastos" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Gastos" }),
  ).toBeVisible();
  await expect(drawer).toHaveCount(0);

  await page.getByRole("button", { name: "Sucursal Centro" }).click();
  const sheet = page.getByRole("dialog", { name: "Sucursal" });
  await expect(sheet).toHaveAttribute("data-side", "bottom");
  await sheet.getByRole("option", { name: /Equipetrol/ }).click();
  await expect(
    page.getByRole("button", { name: "Sucursal Equipetrol" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .getByRole("dialog", { name: "Menú" })
    .getByRole("link", { name: "Personal" })
    .click();
  await expect(page.getByText("Mostrando 1–6 de 6 miembros")).toBeVisible();
  // The header row is hidden and each cell carries its column name.
  await expect(page.getByRole("columnheader", { name: "Rol" })).toBeHidden();
  const roleCell = page.getByRole("cell", { name: "Administración" });
  await expect(roleCell).toHaveAttribute("data-label", "Rol");
  await expect(roleCell).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
