import { expect, test, type Page } from "@playwright/test";
import { addDays, boliviaToday, weekStartOf } from "./support/bolivia";
import { signIn, sidebar } from "./support/session";

// UX-011: a 13-inch laptop (1024 px) is a width the design does not draw.
// The week must still name each Session in full, and the report must keep
// month names and amounts on one line. 1440 and 420 stay as drawn.
const fullType = async (page: Page) => {
  const block = page
    .getByRole("table", { name: "Semana" })
    .getByRole("button", { name: /Reformer Pilates, 07:00/ })
    .first();
  await expect(block).toBeVisible();
  const type = block.locator(":scope > span").first();
  await expect(type).toHaveText("Reformer Pilates");
  await expect(type).toHaveCSS("white-space", "nowrap");
  const time = block.locator(":scope > span").nth(1);
  await expect(time).toContainText("07:00 – 07:50");
  await expect(time).toHaveCSS("white-space", "nowrap");
  const fitted = await type.evaluate(
    (node) => node.scrollWidth <= node.clientWidth + 1,
  );
  expect(fitted).toBe(true);
};

const nowrapFigures = async (page: Page) => {
  const months = page.getByRole("table", { name: "Totales por mes" });
  const month = months.getByText(/de 20\d\d/).first();
  const amount = months.getByText(/Bs [\d.]+,\d{2}/).first();
  await expect(month).toBeVisible();
  await expect(month).toHaveCSS("white-space", "nowrap");
  await expect(amount).toHaveCSS("white-space", "nowrap");
  for (const name of ["Ingresos", "Gastos", "Neto"]) {
    await expect(
      page.getByRole("region", { name }).getByRole("heading", { name }),
    ).toHaveCSS("white-space", "nowrap");
  }
};

test.describe("a 1024 px laptop", () => {
  test.use({ viewport: { width: 1024, height: 900 } });

  test("keeps the week and the report readable", async ({ page }) => {
    const monday = addDays(weekStartOf(boliviaToday()), 7);
    await signIn(page, `/?week=${monday}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Horario" }),
    ).toBeVisible();
    await expect(sidebar(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Abrir menú" })).toHaveCount(
      0,
    );
    await fullType(page);

    await sidebar(page).getByRole("link", { name: "Reporte" }).click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Reporte de ingresos y gastos",
      }),
    ).toBeVisible();
    await nowrapFigures(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
});

test.describe("the drawn widths", () => {
  test("keep the sidebar at 1440 and the drawer at 420", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const monday = addDays(weekStartOf(boliviaToday()), 7);
    await signIn(page, `/?week=${monday}`);
    await expect(sidebar(page)).toBeVisible();
    await fullType(page);
    const sidebarBox = await sidebar(page).boundingBox();
    expect(sidebarBox?.width ?? 0).toBeGreaterThan(220);

    await page.setViewportSize({ width: 420, height: 860 });
    await expect(sidebar(page)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Abrir menú" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page
      .getByRole("dialog", { name: "Menú" })
      .getByRole("link", { name: "Reporte" })
      .click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Reporte de ingresos y gastos",
      }),
    ).toBeVisible();
    await nowrapFigures(page);
  });
});
