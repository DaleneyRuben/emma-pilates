import { expect, test } from "@playwright/test";
import { signIn } from "./support/session";

// AW34: the shell selector scopes Horario to one Branch; the fixtures give
// Centro Mat Pilates and Equipetrol Pilates Prenatal, never the other way.
test("the Branch selector scopes Horario to the chosen Branch", async ({
  page,
}) => {
  await signIn(page);
  // Next week is materialized in full whatever today's weekday is.
  await page.getByRole("button", { name: "Semana siguiente" }).click();

  await expect(
    page.getByText(/^Sucursal Centro · sala única · \d+ sesiones esta semana$/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Mat Pilates, 09:00/ }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Pilates Prenatal/ }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Sucursal Centro" }).click();
  const selector = page.getByRole("dialog", { name: "Sucursal" });
  await expect(
    selector.getByRole("option", { name: /Centro/ }),
  ).toHaveAttribute("aria-selected", "true");
  await selector.getByRole("option", { name: /Equipetrol/ }).click();

  await expect(
    page.getByRole("button", { name: "Sucursal Equipetrol" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /^Sucursal Equipetrol · sala única · \d+ sesiones esta semana$/,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Pilates Prenatal, 17:00/ }).first(),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Mat Pilates/ })).toHaveCount(
    0,
  );
  // The week stays where it was: switching Branch never navigates.
  await expect(page).toHaveURL(/\/\?week=\d{4}-\d{2}-\d{2}$/);
});
