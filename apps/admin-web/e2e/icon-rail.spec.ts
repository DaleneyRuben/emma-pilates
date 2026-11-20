import { expect, test } from "@playwright/test";
import { signIn, sidebar } from "./support/session";

// Walkthrough 2026-11-04 n.º 1: «Promociones» once drew wider than the rail
// and lost its first letter. Since Rosa Emma the rail is the 232 px sidebar
// with 15 px labels; each label must still sit inside its own link.
test.describe("the sidebar", () => {
  for (const width of [1440, 1900]) {
    test(`fits every label inside the rail at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await signIn(page);
      const links = sidebar(page).getByRole("link");
      await expect(links).toHaveCount(9);

      const overflowing = await links.evaluateAll((elements) =>
        elements.flatMap((link) => {
          const text = [...link.childNodes].find(
            (node) => node.nodeType === Node.TEXT_NODE,
          );
          if (text === undefined) return [];
          const range = document.createRange();
          range.selectNodeContents(text);
          const label = range.getBoundingClientRect();
          const box = link.getBoundingClientRect();
          return label.left < box.left || label.right > box.right
            ? [text.textContent]
            : [];
        }),
      );

      expect(overflowing).toEqual([]);
      // Follow-up 285: a nav row is `titulo-fila`, 16 px.
      await expect(sidebar(page).getByRole("link").first()).toHaveCSS(
        "font-size",
        "16px",
      );
    });
  }
});
