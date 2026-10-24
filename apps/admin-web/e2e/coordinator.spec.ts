import { expect, test, type Page } from "@playwright/test";
import { fixtures, webOrigin } from "./support/environment";
import { sidebar, signIn } from "./support/session";

// IDN-009 / ADR-0102: the Coordinator runs the schedule, Clients, and Staff
// from the admin web and never sees an amount; the API refuses the rest.
const noAmountOn = async (page: Page) => {
  await page.waitForLoadState("networkidle");
  expect(await page.locator("body").innerText()).not.toContain("Bs");
};

test.describe("the Coordinator's admin web", () => {
  test("shows operations without a single amount", async ({ page }) => {
    await signIn(page, "/", fixtures.coordinator);

    // Lucía, Valeria, and Isabel start a paid Plan inside the first 90 days
    // with no Booking, so the worker's first pass badges those three.
    // Renata has no Plan, so she is not one of them.
    await expect(
      sidebar(page).getByRole("link", {
        name: "Para contactar, 3 para contactar",
      }),
    ).toBeVisible();
    await expect(sidebar(page).getByRole("link")).toHaveText([
      "Horario",
      "Clientes",
      "Para contactar3",
      "Personal",
      "Indicadores",
    ]);
    await expect(
      page.getByRole("heading", { level: 1, name: "Horario" }),
    ).toBeVisible();
    await noAmountOn(page);

    await sidebar(page).getByRole("link", { name: "Clientes" }).click();
    await page.getByRole("button", { name: "Mariana Peña" }).click();
    const panel = page.getByRole("dialog", { name: "Mariana Peña" });
    await expect(
      panel.getByRole("button", { name: "Editar perfil" }),
    ).toBeVisible();
    await expect(
      panel.getByRole("button", { name: "Cerrar cuenta" }),
    ).toHaveCount(0);
    await noAmountOn(page);

    await panel.getByRole("button", { name: "Editar perfil" }).click();
    await panel.getByLabel("Teléfono").fill("+591 70011888");
    await panel.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(
      panel.getByText("Guardamos los cambios del perfil."),
    ).toBeVisible();
    await expect(panel.getByText("+591 70011888")).toBeVisible();
    await page.keyboard.press("Escape");

    await sidebar(page).getByRole("link", { name: "Personal" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Personal" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Nuevo miembro" }),
    ).toHaveCount(0);
    await noAmountOn(page);
  });

  test("returns money pages to Horario and the API refuses their data", async ({
    page,
  }) => {
    await signIn(page, "/back-office/pagos", fixtures.coordinator);

    await expect(
      page.getByText("Esa sección es solo para administración."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/\?aviso=sin-acceso$/);

    for (const path of [
      "/api/v1/administrator/payments",
      "/api/v1/administrator/reports/income?from=2026-10-01T04:00:00.000Z&until=2026-11-01T04:00:00.000Z",
      "/api/v1/administrator/salary-payments",
    ]) {
      const refused = await page.request.get(path, {
        headers: { Origin: webOrigin },
      });
      expect(refused.status(), path).toBe(403);
    }
  });
});
