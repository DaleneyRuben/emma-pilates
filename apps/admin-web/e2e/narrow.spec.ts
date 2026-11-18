import { expect, test } from "@playwright/test";
import { sidebar, signIn } from "./support/session";

// The 420 px variant every admin screen has (design system → Admin Desktop
// Web Responsiveness, P01d): the menu of nine destinations, bottom sheet,
// and one compact card per row.
test.use({ viewport: { width: 420, height: 860 } });

test("a narrow browser gets the drawer, the bottom-sheet selector, and card rows", async ({
  page,
}) => {
  await signIn(page, "/estudio/personal");
  await expect(sidebar(page)).toHaveCount(0);

  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .getByRole("dialog", { name: "Menú" })
    .getByRole("link", { name: /^Clientas/ })
    .click();
  // Isabel stays. The clients journey closes Lucía, and the suite shares
  // one database, so this walk cannot depend on her still being there.
  await page.getByRole("button", { name: "Isabel Arce" }).click();
  const client = page.getByRole("dialog", { name: "Isabel Arce" });
  await expect(client).toHaveAttribute("data-presentation", "full-screen");
  await expect(
    client.getByRole("heading", { name: "Isabel Arce" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(client).toHaveCount(0);

  await page.getByRole("button", { name: "Abrir menú" }).click();
  const drawer = page.getByRole("dialog", { name: "Menú" });
  await expect(drawer.getByRole("link", { name: "Horario" })).toBeVisible();
  await drawer.getByRole("link", { name: /^Dinero/ }).click();
  await page
    .getByRole("navigation", { name: "Páginas de Dinero" })
    .getByRole("link", { name: "Gastos" })
    .click();
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
    .getByRole("link", { name: /^Estudio/ })
    .click();
  await expect(page.getByText("Mostrando 1–7 de 7 miembros")).toBeVisible();
  // FIX-088 (Tablas en celular A): the header row is hidden and each row is
  // a compact card: the name in bold, one detail line, the status.
  await expect(page.getByRole("columnheader", { name: "Rol" })).toBeHidden();
  const card = page.locator("tr[data-compact]").filter({
    hasText: "Paola Mendoza",
  });
  await expect(card.locator('[data-part="title"]')).toContainText(
    "Paola Mendoza",
  );
  await expect(card.locator('[data-part="detail"]')).toContainText(
    "Administradora",
  );
  await expect(card.locator("td[data-label]")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
