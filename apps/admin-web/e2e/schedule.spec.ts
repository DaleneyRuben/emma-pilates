import { expect, test } from "@playwright/test";
import { addDays, boliviaToday, weekStartOf } from "./support/bolivia";
import { signIn } from "./support/session";

// AW03 through the real backend: a one-off Session created next Saturday
// at Centro, where the fixtures schedule nothing, then moved an hour later
// from Editar sesión.
test("creates a one-off Session and moves it from Editar sesión", async ({
  page,
}) => {
  const monday = addDays(weekStartOf(boliviaToday()), 7);
  const saturday = addDays(monday, 5);
  await signIn(page, `/?week=${monday}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Horario" }),
  ).toBeVisible();
  const week = page.getByRole("table", { name: "Semana" });
  await expect(
    week
      .getByRole("button", { name: /Reformer Pilates, 07:00, Emma Vargas/ })
      .first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Nueva sesión", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Nueva sesión" });
  await expect(panel.getByText("Sucursal Centro · sala única")).toBeVisible();
  await expect(panel.getByLabel("Una sola vez")).toBeChecked();
  await panel
    .getByLabel("Tipo de clase")
    .selectOption({ label: "Reformer Pilates" });
  await panel
    .getByLabel("Entrenadora")
    .selectOption({ label: "Daniela Ortiz" });
  await expect(panel.getByLabel("Capacidad")).toHaveValue("12");
  await panel.getByLabel("Fecha").fill(saturday);
  await panel.getByLabel("Hora").fill("11:00");
  await panel.getByLabel("Duración").fill("75");
  await panel.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByRole("status")).toHaveText("Sesión creada.");
  await expect(panel).toHaveCount(0);
  const created = week.getByRole("button", {
    name: "Reformer Pilates, 11:00, Daniela Ortiz, 0 de 12 lugares",
  });
  await expect(created).toBeVisible();
  await expect(created).toContainText("11:00 – 12:15");

  await created.click();
  const edit = page.getByRole("dialog", { name: "Editar sesión" });
  // A one-off Session belongs to no series: no «Solo esta sesión» choice.
  await expect(edit.getByLabel("Solo esta sesión")).toHaveCount(0);
  await expect(edit.getByText("Reformer Pilates")).toBeVisible();
  await expect(edit.getByLabel("Fecha")).toHaveValue(saturday);
  await expect(edit.getByLabel("Duración")).toHaveValue("75");
  await expect(
    edit.getByText(
      "Sin reservas: si sigue vacía, el sistema la cancela sola 2 horas antes de empezar.",
    ),
  ).toBeVisible();
  await edit.getByLabel("Hora").fill("12:00");
  await edit.getByRole("button", { name: "Guardar" }).click();

  await expect(page.getByRole("status")).toHaveText("Sesión actualizada.");
  await expect(edit).toHaveCount(0);
  await expect(created).toHaveCount(0);
  const moved = week.getByRole("button", {
    name: "Reformer Pilates, 12:00, Daniela Ortiz, 0 de 12 lugares",
  });
  await expect(moved).toBeVisible();
  await expect(moved).toContainText("12:00 – 13:15");

  // The week in the address is the one drawn after a reload.
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`week=${monday}`));
  await expect(moved).toBeVisible();
});
