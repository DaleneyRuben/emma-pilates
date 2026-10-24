import { expect, test } from "@playwright/test";
import { signIn } from "./support/session";

// AW23 as the representative list: an allowlisted filter lives in the
// address (ADR-0042, ADR-0062) and survives a reload.
test("Personal keeps its Role filter in the address", async ({ page }) => {
  await signIn(page, "/back-office/personal");
  await expect(page.getByText("Mostrando 1–7 de 7 miembros")).toBeVisible();

  await page.getByLabel("Rol").selectOption("trainer");

  await expect(page).toHaveURL(
    /\/back-office\/personal\?page=1&pageSize=20&role=trainer$/,
  );
  await expect(page.getByText("Mostrando 1–3 de 3 miembros")).toBeVisible();
  await expect(page.getByRole("cell", { name: /Emma Vargas/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: /Camila Rojas/ })).toHaveCount(0);

  await page.reload();

  await expect(page.getByLabel("Rol")).toHaveValue("trainer");
  await expect(page.getByText("Mostrando 1–3 de 3 miembros")).toBeVisible();
  await expect(page.getByRole("cell", { name: /Camila Rojas/ })).toHaveCount(0);
});
