import { expect, test } from "@playwright/test";
import { signIn } from "./support/session";

test("reads the month report and asks a question at 1440 and 420", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, "/reporte/indicadores");
  await expect(
    page.getByRole("heading", { level: 1, name: "Indicadores" }),
  ).toBeVisible();
  const report = page.getByRole("region", { name: "Informe del mes" });
  await expect(report).toBeVisible();
  await expect(report).toContainText(
    /se dictaron \d+ clases|no se dictaron clases/,
  );
  await expect(report.getByLabel("Pregunta sobre el mes")).toBeVisible();

  await report.getByRole("button", { name: "Preguntar" }).click();
  await report.getByLabel("Pregunta sobre el mes").fill("ocupación");
  await report.getByRole("button", { name: "Preguntar" }).click();
  await expect(report).toContainText(/ocupación del mes fue del \d+ %/);

  await report.getByLabel("Pregunta sobre el mes").fill("Ana Mendoza");
  await report.getByRole("button", { name: "Preguntar" }).click();
  await expect(report).toContainText(
    "Solo puedo responder sobre los indicadores del mes.",
  );
  await expect(report).not.toContainText("Ana");

  await page.setViewportSize({ width: 420, height: 860 });
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("link", { name: "Indicadores" }).click();
  await expect(report).toBeVisible();
  await expect(page.getByRole("region", { name: "Ocupación" })).toBeVisible();
});
