import { expect, test } from "@playwright/test";
import { inviteClient, sendTransfer } from "./support/api";
import { signIn } from "./support/session";

// AW22 through the real backend: the closure the rules refuse (a transfer
// awaiting review, ADR-0097), then one that goes through and erases the
// Client from the list.
test("refuses to close a Client with a transfer in review, then closes another", async ({
  page,
}) => {
  await sendTransfer("sofia@example.com");
  await signIn(page, "/clientas");
  await expect(page.getByText("Mostrando 6 de 6 clientas")).toBeVisible();

  await page.getByRole("button", { name: "Sofía Guzmán" }).click();
  const sofia = page.getByRole("dialog", { name: "Sofía Guzmán" });
  await sofia.getByRole("button", { name: "Cerrar cuenta" }).click();
  const refused = page.getByRole("alertdialog", {
    name: "¿Cerrar la cuenta de Sofía Guzmán?",
  });
  // Refused at once: the closure button never enables.
  await expect(
    refused.getByText(
      "No se puede cerrar todavía: tiene un pago por QR en revisión. Confírmalo o recházalo en Pagos y vuelve a intentarlo.",
    ),
  ).toBeVisible();
  await expect(
    refused.getByRole("link", { name: "Ir a Pagos" }),
  ).toHaveAttribute("href", "/dinero/pagos");
  await expect(
    refused.getByRole("button", { name: "Cerrar cuenta" }),
  ).toBeDisabled();
  await refused.getByRole("button", { name: "Volver" }).click();
  await expect(refused).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(sofia).toHaveCount(0);

  await page.getByRole("button", { name: "Lucía Fernández" }).click();
  const lucia = page.getByRole("dialog", { name: "Lucía Fernández" });
  // UX-018: a panel with no field opens on its heading.
  await expect(
    lucia.getByRole("heading", { name: "Lucía Fernández" }),
  ).toBeFocused();
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
  await expect(page.getByText("Mostrando 5 de 5 clientas")).toBeVisible();

  // Closed for good: the list stays without her after a reload.
  await page.reload();
  await expect(page.getByText("Mostrando 5 de 5 clientas")).toBeVisible();
  await expect(page.getByText("lucia@example.com")).toHaveCount(0);
});

// AW22 after the closures above (it adds a Client to the count): a Client the Assistant just invited shows
// the «Pendiente de activación» aviso, and «Reenviar enlace» reaches the
// same resend as the Staff app. Her invitation email went out a moment ago,
// so the recipient limit answers with its wait.
test("resends a pending Client's activation link and shows the recipient wait", async ({
  page,
}) => {
  await inviteClient("Daniela Rojas", "daniela.rojas@example.com");
  await signIn(page, "/clientas");

  await page.getByRole("button", { name: "Daniela Rojas" }).click();
  const panel = page.getByRole("dialog", { name: "Daniela Rojas" });
  await expect(panel.getByText("Pendiente de activación")).toBeVisible();
  await expect(panel.getByText(/^El enlace vence el /)).toBeVisible();

  const resend = panel.getByRole("button", { name: "Reenviar enlace" });
  await resend.click();

  await expect(
    panel.getByText(
      "Ya enviamos un correo a esa dirección hace poco. El enlace vigente sigue sirviendo.",
    ),
  ).toBeVisible();
  await expect(
    panel.getByText(/^Podrás reenviarlo en \d+:\d{2}\.$/),
  ).toBeVisible();
  await expect(resend).toBeDisabled();
});
