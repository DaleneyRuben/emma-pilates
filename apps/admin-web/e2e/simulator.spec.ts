import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./support/session";

const openSimulator = async (page: Page) => {
  await signIn(page, "/simulador");
  await expect(
    page.getByRole("heading", { level: 1, name: "Simulador" }),
  ).toBeVisible();
};

test("the administrator sees the three horizons", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSimulator(page);
  const projection = page.getByRole("region", { name: "Proyección" });
  await expect(
    projection.getByRole("row", { name: /3 meses Base/ }),
  ).toBeVisible();
  await expect(
    projection.getByRole("row", { name: /6 meses Bajo/ }),
  ).toBeVisible();
  await expect(
    projection.getByRole("row", { name: /12 meses Alto/ }),
  ).toBeVisible();
  await expect(projection.getByText("Bs 111.540,00")).toBeVisible();
});

test("a narrow browser still shows the three horizons", async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 860 });
  await openSimulator(page);
  await expect(page.getByRole("navigation", { name: "Secciones" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(
    page.getByRole("dialog", { name: "Menú" }).getByRole("link", {
      name: "Simulador",
    }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  const projection = page.getByRole("region", { name: "Proyección" });
  await expect(
    projection.getByRole("row", { name: /3 meses Base/ }),
  ).toBeVisible();
  await expect(
    projection.getByRole("row", { name: /6 meses Bajo/ }),
  ).toBeVisible();
  await expect(
    projection.getByRole("row", { name: /12 meses Alto/ }),
  ).toBeVisible();
});
