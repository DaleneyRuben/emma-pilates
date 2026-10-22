import { expect, test, type ConsoleMessage } from "@playwright/test";
import { signIn, sidebar } from "./support/session";

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
    await sidebar(page).getByRole("link", { name: section }).click();
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  }
  await page.getByRole("link", { name: "Contactos para promociones" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Contactos para promociones" }),
  ).toBeVisible();

  expect(refused).toEqual([]);
});
