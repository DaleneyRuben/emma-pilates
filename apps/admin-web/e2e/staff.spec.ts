import { expect, test } from "@playwright/test";
import { signIn } from "./support/session";

// UX-005: the 1440 px desktop reference names the Roles as the rest of the
// product does. Desktop Chrome's default viewport is 1280, so this walk sets
// the width the design review uses.
test.use({ viewport: { width: 1440, height: 900 } });

// AW23/AW24 through the real backend: an invitation sent (the worker
// captures its email locally), the pending member reopened, and an active
// member deactivated after the confirmation.
test("invites a Nutritionist and deactivates an Assistant", async ({
  page,
}) => {
  await signIn(page, "/back-office/personal");
  await expect(page.getByRole("cell", { name: /Camila Rojas/ })).toBeVisible();
  expect(page.viewportSize()).toEqual({ width: 1440, height: 900 });
  const roleFilter = page.getByLabel("Rol");
  await expect(roleFilter.locator("option")).toHaveText([
    "Todos",
    "Entrenadora",
    "Asistente",
    "Administración",
    "Nutricionista",
    "Coordinador",
  ]);
  await expect(
    page.getByRole("row", { name: /Emma Vargas/ }).getByText("Entrenadora"),
  ).toBeVisible();
  await expect(
    page
      .getByRole("row", { name: /Paola Mendoza/ })
      .getByText("Administración"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Nuevo miembro" }).click();
  const panel = page.getByRole("dialog", { name: "Nuevo miembro" });
  await expect(
    panel.getByText(
      "Le enviaremos un enlace de activación a este correo. Vence en 7 días.",
    ),
  ).toBeVisible();
  await panel.getByLabel("Nombre", { exact: true }).fill("Valentina Soria");
  await panel.getByLabel("Correo electrónico").fill("valentina@emmapilates.bo");
  // The radio and the chip inputs are visually hidden; their labels take
  // the click.
  await panel
    .getByRole("group", { name: "Rol" })
    .getByText("Nutricionista", { exact: true })
    .click();
  await expect(
    panel.getByRole("radio", { name: "Nutricionista" }),
  ).toBeChecked();
  await panel.getByText("Centro", { exact: true }).click();
  await expect(panel.getByRole("checkbox", { name: "Centro" })).toBeChecked();
  await panel.getByRole("button", { name: "Guardar" }).click();

  await expect(
    page.getByText(
      "Invitación enviada a valentina@emmapilates.bo: tiene 7 días para activar su cuenta.",
    ),
  ).toBeVisible();
  await expect(panel).toHaveCount(0);
  const valentina = page.getByRole("row", { name: /Valentina Soria/ });
  await expect(valentina.getByText("Nutricionista")).toBeVisible();
  await expect(valentina.getByText("Pendiente")).toBeVisible();

  await page.getByRole("button", { name: "Valentina Soria" }).click();
  const pending = page.getByRole("dialog", { name: "Editar miembro" });
  await expect(pending.getByText("Pendiente de activación")).toBeVisible();
  await expect(pending.getByText("valentina@emmapilates.bo")).toBeVisible();
  await expect(
    pending.getByRole("button", { name: "Reenviar enlace" }),
  ).toBeVisible();
  // Cancelled before she activates: the links die, the email is freed,
  // and Personal shows the six fixture members again.
  await pending.getByRole("button", { name: "Cancelar invitación" }).click();
  const cancel = page.getByRole("alertdialog", {
    name: "¿Cancelar la invitación de Valentina Soria?",
  });
  await cancel.getByRole("button", { name: "Sí, cancelar invitación" }).click();
  await expect(
    page.getByText("Cancelamos la invitación de Valentina Soria."),
  ).toBeVisible();
  await expect(pending).toHaveCount(0);
  await expect(valentina).toHaveCount(0);
  await expect(page.getByText("Mostrando 1–7 de 7 miembros")).toBeVisible();

  await page.getByRole("button", { name: "Camila Rojas" }).click();
  const camila = page.getByRole("dialog", { name: "Editar miembro" });
  await camila.getByRole("button", { name: "Desactivar cuenta" }).click();
  const confirm = page.getByRole("alertdialog", {
    name: "¿Desactivar a Camila Rojas?",
  });
  await expect(
    confirm.getByText(
      "Cerramos todas sus sesiones y ya no podrá entrar. Su historial se conserva.",
    ),
  ).toBeVisible();
  await confirm.getByRole("button", { name: "Desactivar" }).click();

  await expect(
    page.getByText(
      "Camila Rojas ya no tiene acceso: cerramos todas sus sesiones.",
    ),
  ).toBeVisible();
  await expect(camila).toHaveCount(0);
  await expect(
    page.getByRole("row", { name: /Camila Rojas/ }).getByText("Desactivado"),
  ).toBeVisible();

  // A deactivated member opens read-only.
  await page.getByRole("button", { name: "Camila Rojas" }).click();
  await expect(
    camila.getByRole("button", { name: "Desactivar cuenta" }),
  ).toHaveCount(0);
  await expect(camila.getByRole("button", { name: "Guardar" })).toHaveCount(0);
});
