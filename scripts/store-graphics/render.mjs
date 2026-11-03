// Store graphics for Google Play and the App Store, option A «Editorial»
// (owner, 2026-11-03): Lino ground, a small uppercase label, a Lora title
// on the left, the real screen in a dark frame that runs off the bottom.
// No price or launch discount on any image: the offer is temporary.
//
//   node scripts/store-graphics/render.mjs [client|staff]
//
// Reads the raw captures in docs/store/graphics/raw/ and writes every size
// to docs/store/graphics/{play,apple}/<device>/<app>/. Playwright comes from the admin web.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { apps } from "./copy.mjs";
import { featureHtml, shotHtml } from "./templates.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const require = createRequire(path.join(root, "apps/admin-web/package.json"));
const { chromium } = require("@playwright/test");
// The app fonts, from the mobile packages that ship them.
const fontRequire = createRequire(path.join(root, "packages/mobile-core/package.json"));

const graphics = path.join(root, "docs/store/graphics");
// Fonts go in as data URIs: a page set from a string may not load file URLs.
const fontUri = (pkg, file) =>
  `data:font/ttf;base64,${readFileSync(
    path.join(path.dirname(fontRequire.resolve(`@expo-google-fonts/${pkg}/package.json`)), file.split("_").pop().replace(".ttf", ""), file),
  ).toString("base64")}`;
const fonts = {
  lora: (name) => fontUri("lora", `Lora_${name}.ttf`),
  work: (name) => fontUri("work-sans", `WorkSans_${name}.ttf`),
};

// Each target: the store folder, the device frame and the size in pixels.
// Play: phone 9:16, tablet 9:16. Apple: iPhone 6.9" and iPad 13".
const targets = [
  { out: "play/phone", device: "phone", width: 1080, height: 1920 },
  { out: "play/tablet", device: "tablet", width: 1440, height: 2560 },
  { out: "apple/iphone-6.9", device: "phone", width: 1320, height: 2868 },
  { out: "apple/ipad-13", device: "tablet", width: 2064, height: 2752 },
];

const only = process.argv[2];

const dataUri = (file) => `data:image/png;base64,${readFileSync(file).toString("base64")}`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const shoot = async (html, width, height, file) => {
    mkdirSync(path.dirname(file), { recursive: true });
    await page.setViewportSize({ width, height });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: file });
  };
  for (const [app, copy] of Object.entries(apps)) {
    if (only !== undefined && only !== app) continue;
    for (const target of targets) {
      for (const shot of copy.shots) {
        const screen = dataUri(path.join(graphics, "raw", app, target.device, `${shot.file}.png`));
        const html = shotHtml({ ...shot, ...target, screen, fonts });
        await shoot(html, target.width, target.height, path.join(graphics, target.out, app, `${shot.file}.png`));
      }
    }
    const logo = { ...copy.logo, src: dataUri(path.join(root, copy.logo.file)) };
    await shoot(featureHtml({ ...copy.feature, logo, fonts }), 1024, 500, path.join(graphics, "play", app, "feature-graphic.png"));
  }
} finally {
  await browser.close();
}
console.log("store graphics written to docs/store/graphics/{play,apple}");
