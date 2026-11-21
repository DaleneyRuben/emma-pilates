import { expect, test } from "@playwright/test";
import { inviteClient } from "./support/api";
import { signIn } from "./support/session";

// AW22 through the real backend: a Client the Assistant just invited shows
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
