import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";
import { sendTransfer } from "./support/api";
import { signIn, sidebar } from "./support/session";

const bodyScrollable = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).overflowY !== "hidden");

// WEB-030: the built app runs under the deployed Content-Security-Policy
// (`vite preview` sends vercel.json's headers), and nothing it draws on the
// busiest pages is refused by it.
test("serves the security headers and stays within its policy", async ({
  page,
}) => {
  const refused: string[] = [];
  page.on("console", (message: ConsoleMessage) => {
    if (/Content Security Policy|Refused to/i.test(message.text())) {
      refused.push(message.text());
    }
  });

  await sendTransfer("isabel@example.com");
  const response = await page.goto("/iniciar-sesion");
  const headers = response?.headers() ?? {};
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");

  await signIn(page, "/");
  // WEB-035: the first-load state index.html draws is gone once a page is
  // on screen, and its stylesheet and image pass the policy.
  await expect(page.locator("#arranque")).toHaveCount(0);
  for (const section of ["Clientes", "Pagos", "Reporte", "Promociones"]) {
    // «Pagos a instructoras» also contains the word Pagos.
    await sidebar(page)
      .getByRole("link", { name: section, exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  }
  await page.getByRole("link", { name: "Contactos para promociones" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Contactos para promociones" }),
  ).toBeVisible();

  // WEB-037: the overlays lock the page behind them without the <style>
  // element Radix would inject, and the lock holds while one sits over
  // another, until the last one closes.
  await sidebar(page).getByRole("link", { name: "Pagos", exact: true }).click();
  await page.getByRole("button", { name: "Isabel Arce" }).click();
  const panel = page.getByRole("dialog", { name: "Revisar pago" });
  await expect(panel.getByText("Monto a verificar")).toBeVisible();
  expect(await bodyScrollable(page)).toBe(false);

  await panel.getByRole("button", { name: "Ver en grande" }).click();
  const enlarged = page.getByRole("dialog", { name: "Comprobante ampliado" });
  await expect(enlarged).toBeVisible();
  expect(await bodyScrollable(page)).toBe(false);
  await page.keyboard.press("Escape");
  await expect(enlarged).toHaveCount(0);
  expect(await bodyScrollable(page)).toBe(false);

  await panel.getByRole("button", { name: "Confirmar pago" }).click();
  const confirm = page.getByRole("alertdialog", {
    name: "¿Confirmar el pago de Isabel Arce?",
  });
  await expect(confirm).toBeVisible();
  expect(await bodyScrollable(page)).toBe(false);
  await confirm.getByRole("button", { name: "Volver" }).click();
  await expect(confirm).toHaveCount(0);
  expect(await bodyScrollable(page)).toBe(false);

  await panel.getByRole("button", { name: "Cerrar" }).click();
  await expect(panel).toHaveCount(0);
  expect(await bodyScrollable(page)).toBe(true);

  expect(refused).toEqual([]);
});
