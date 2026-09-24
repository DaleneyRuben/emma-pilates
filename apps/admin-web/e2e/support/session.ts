import { expect, type Page } from "@playwright/test";
import { fixtures } from "./environment";

/** AW01: the fixture Administrator signs in and lands on Horario. */
export async function signIn(page: Page, path = "/"): Promise<void> {
  await page.goto(path);
  await page
    .getByLabel("Correo electrónico")
    .fill(fixtures.administrator.email);
  await page.getByLabel("Contraseña").fill(fixtures.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(
    page.getByRole("button", {
      name: `Tu cuenta: ${fixtures.administrator.name}`,
    }),
  ).toBeVisible();
}

export const sidebar = (page: Page) =>
  page.getByRole("navigation", { name: "Secciones" });
