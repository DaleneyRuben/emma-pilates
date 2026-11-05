import { expect, test } from "@playwright/test";
import { signIn, sidebar } from "./support/session";

// Walkthrough 2026-11-04 n.º 1: P01's rail is 96 px with 12 px labels.
// «Promociones» drew at 15 px, wider than the rail, and lost its first
// letter. Each label must sit inside its own link.
test.describe("P01 icon rail", () => {
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
      await expect(sidebar(page).getByRole("link").first()).toHaveCSS(
        "font-size",
        "12px",
      );
    });
  }
});
