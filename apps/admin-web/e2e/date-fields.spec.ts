import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./support/session";

// UX-008 finding A2: the Session form owns dd/mm/aaaa and 24-hour time
// instead of the browser's locale picker. The browser itself is set to
// Europe/Madrid (playwright.config.ts), so a native input would not show this.
const openNewSession = async (page: Page) => {
  await signIn(page);
  await expect(
    page.getByRole("heading", { level: 1, name: "Horario" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nueva sesión", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Nueva sesión" });
  await expect(panel.getByLabel("Fecha")).toBeVisible();
  return panel;
};

test.describe("AW03 date and time fields", () => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 420, height: 860 },
  ]) {
    test(`types 21/10/2026 and 09:00 at ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const panel = await openNewSession(page);

      const date = panel.getByRole("textbox", { name: "Fecha" });
      const time = panel.getByRole("textbox", { name: "Hora" });
      await expect(date).toHaveAttribute("placeholder", "dd/mm/aaaa");
      await expect(time).toHaveAttribute("placeholder", "hh:mm");

      await date.pressSequentially("21102026");
      await time.pressSequentially("0900");

      await expect(date).toHaveValue("21/10/2026");
      await expect(time).toHaveValue("09:00");
      await expect(date).not.toHaveValue("10/21/2026");
      await expect(time).not.toHaveValue(/AM|PM/);
    });
  }
});
