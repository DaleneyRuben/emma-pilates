import { expect, test } from "@playwright/test";
import { sendTransfer } from "./support/api";
import { signIn } from "./support/session";

// AW22 through the real backend: the closure the rules refuse (a transfer
// awaiting review, ADR-0097), then one that goes through and erases the
// Client from the list.
test("refuses to close a Client with a transfer in review, then closes another", async ({
  page,
}) => {
  await sendTransfer("sofia@example.com");
  await signIn(page, "/back-office/clientes");
  await expect(page.getByText("Mostrando 5 de 5 clientas")).toBeVisible();

  await page.getByRole("button", { name: "Sofía Guzmán" }).click();
  const sofia = page.getByRole("dialog", { name: "Sofía Guzmán" });
  await sofia.getByRole("button", { name: "Cerrar cuenta" }).click();
  const refused = page.getByRole("alertdialog", {
    name: "¿Cerrar la cuenta de Sofía Guzmán?",
  });
  // Refused at once: the closure button never enables.
  await expect(
    refused.getByText(
      "No se puede cerrar todavía: tiene un pago por transferencia en revisión. Confírmalo o recházalo en Pagos y vuelve a intentarlo.",
    ),
  ).toBeVisible();
  await expect(
    refused.getByRole("link", { name: "Ir a Pagos" }),
  ).toHaveAttribute("href", "/back-office/pagos");
  await expect(
    refused.getByRole("button", { name: "Cerrar cuenta" }),
  ).toBeDisabled();
  await refused.getByRole("button", { name: "Volver" }).click();
  await expect(refused).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(sofia).toHaveCount(0);

  await page.getByRole("button", { name: "Lucía Fernández" }).click();
  const lucia = page.getByRole("dialog", { name: "Lucía Fernández" });
  await expect(lucia.getByText("5 de 8")).toBeVisible();
  await lucia.getByRole("button", { name: "Cerrar cuenta" }).click();
  const dialog = page.getByRole("alertdialog", {
    name: "¿Cerrar la cuenta de Lucía Fernández?",
  });
  await expect(
    dialog.getByText(
      "Su plan Paquete de 8 clases termina hoy, sin reembolso; pierde las 5 clases que le quedan.",
    ),
  ).toBeVisible();
  await expect(
    dialog.getByText(
      "Se cierra su sesión en todos sus dispositivos y su correo queda libre.",
    ),
  ).toBeVisible();
  await expect(
    dialog.getByText(
      "Se borran su nombre, correo, teléfono y foto. Sus pagos y clases se conservan sin sus datos, para la contabilidad del estudio.",
    ),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Cerrar cuenta" }).click();

  await expect(
    page.getByText("Cuenta de Lucía Fernández cerrada."),
  ).toBeVisible();
  await expect(lucia).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Lucía Fernández" }),
  ).toHaveCount(0);
  await expect(page.getByText("Mostrando 4 de 4 clientas")).toBeVisible();

  // Closed for good: the list stays without her after a reload.
  await page.reload();
  await expect(page.getByText("Mostrando 4 de 4 clientas")).toBeVisible();
  await expect(page.getByText("lucia@example.com")).toHaveCount(0);
});
