import { expect, test } from "@playwright/test";
import { sendTransfer } from "./support/api";
import { signIn } from "./support/session";

// AW28/AW29 through the real backend and the real receipt the worker
// finalised: one transfer confirmed, the other rejected with a reason, and
// both decided in the Todos filter afterwards.
test("confirms one transfer and rejects another with a reason", async ({
  page,
}) => {
  await sendTransfer("mariana@example.com");
  await sendTransfer("sofia@example.com");
  await signIn(page, "/back-office/pagos");
  await expect(
    page.getByText("Todo el estudio · 2 transferencias esperando revisión"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Mariana Peña" }).click();
  const panel = page.getByRole("dialog", { name: "Revisar pago" });
  await expect(panel.getByText("Monto a verificar")).toBeVisible();
  // Mariana has no earlier Plan, so this sale reserves her founder place
  // and the panel shows the 15 % price.
  await expect(panel.getByText("Bs 476,00")).toBeVisible();
  await expect(panel.getByText("Transferencia")).toBeVisible();
  const receipt = panel.getByRole("img", {
    name: "Comprobante de Mariana Peña",
  });
  await expect(receipt).toBeVisible();
  // The receipt is read straight from the API, never cached.
  expect(
    await receipt.evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
  await panel.getByRole("button", { name: "Ver en grande" }).click();
  const enlarged = page.getByRole("dialog", { name: "Comprobante ampliado" });
  await expect(enlarged).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(enlarged).toHaveCount(0);
  await expect(panel.getByText("Monto a verificar")).toBeVisible();

  await panel.getByRole("button", { name: "Confirmar pago" }).click();
  const confirm = page.getByRole("alertdialog", {
    name: "¿Confirmar el pago de Mariana Peña?",
  });
  await confirm.getByRole("button", { name: "Confirmar pago" }).click();
  await expect(
    page.getByText(
      "Pago de Mariana Peña confirmado: su plan Paquete de 8 clases empieza hoy.",
    ),
  ).toBeVisible();
  await expect(panel).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Mariana Peña", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Todo el estudio · 1 transferencia esperando revisión"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Sofía Guzmán" }).click();
  await expect(panel.getByText("Monto a verificar")).toBeVisible();
  await panel.getByRole("button", { name: "Rechazar" }).click();
  const reason = panel.getByRole("textbox", { name: "Motivo del rechazo" });
  await expect(reason).toBeFocused();
  const reject = panel.getByRole("button", { name: "Confirmar rechazo" });
  await expect(reject).toBeDisabled();
  await reason.fill("El monto no coincide con la transferencia recibida.");
  await reject.click();
  await expect(
    page.getByText("Pago de Sofía Guzmán rechazado: le avisamos el motivo."),
  ).toBeVisible();
  await expect(
    page.getByText("Todo el estudio · ninguna transferencia por revisar"),
  ).toBeVisible();

  // Decided Payments stay as history under Todos and never open again.
  await page.goto("/back-office/pagos?status=all");
  const mariana = page.getByRole("row", { name: /Mariana Peña/ });
  await expect(mariana.getByText("Confirmado")).toBeVisible();
  const sofia = page.getByRole("row", { name: /Sofía Guzmán/ });
  await expect(sofia.getByText("Rechazado")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mariana Peña", exact: true }),
  ).toHaveCount(0);
});
