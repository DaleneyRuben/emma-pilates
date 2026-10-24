import { expect, type Page, type Request } from "@playwright/test";
import { fixtures } from "./environment";

/**
 * AW01: a fixture Staff Member (the Administrator unless named) signs in
 * and lands on Horario.
 */
export async function signIn(
  page: Page,
  path = "/",
  account: { email: string; name: string } = fixtures.administrator,
): Promise<void> {
  await page.goto(path);
  await page.getByLabel("Correo electrónico").fill(account.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(fixtures.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(
    page.getByRole("button", { name: `Tu cuenta: ${account.name}` }),
  ).toBeVisible();
}

export const sidebar = (page: Page) =>
  page.getByRole("navigation", { name: "Secciones" });

/**
 * Counts the page's `/api/` requests from now on; `settled()` waits until
 * none is in flight, so a session ended behind the browser's back cannot
 * answer one of them 401 and send the page to Login a moment later.
 */
export function trackApiRequests(page: Page): { settled: () => Promise<void> } {
  const inFlight = new Set<Request>();
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) {
      inFlight.add(request);
    }
  });
  const finish = (request: Request) => inFlight.delete(request);
  page.on("requestfinished", finish);
  page.on("requestfailed", finish);
  return {
    settled: () => expect.poll(() => inFlight.size).toBe(0),
  };
}
