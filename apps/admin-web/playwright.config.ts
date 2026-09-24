import { defineConfig, devices } from "@playwright/test";
import { webOrigin } from "./e2e/support/environment";

/**
 * ADR-0043: a small suite of release-critical journeys through the built
 * app (`vite preview`) and the real backend on a disposable
 * `pilates_test_*` database that the global setup creates, loads the
 * development fixtures into, and drops afterwards. Only Chromium runs
 * here: it is the build already cached for the browser walks (Chromium
 * 1228); Firefox and WebKit need `playwright install` first.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/support/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: webOrigin,
    locale: "es-BO",
    // A European clock proves every date and time still reads in Bolivia
    // civil time (ADR-0057), as the browser walks do.
    timezoneId: "Europe/Madrid",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
