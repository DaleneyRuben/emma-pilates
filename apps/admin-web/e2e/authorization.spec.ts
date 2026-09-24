import { expect, test } from "@playwright/test";
import { fixtures, webOrigin } from "./support/environment";
import { sidebar, signIn } from "./support/session";

const sessionPath = "/api/v1/admin-web/authentication-sessions/current";

test.describe("authorization at the backend boundary", () => {
  test("refuses an Assistant at Login with the same neutral message as a wrong password (ADR-0029)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel("Correo electrónico").fill(fixtures.assistant.email);
    await page.getByLabel("Contraseña").fill(fixtures.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page.getByRole("alert")).toHaveText(
      "El correo o la contraseña no son correctos.",
    );
    await expect(page.getByLabel("Correo electrónico")).toHaveValue(
      fixtures.assistant.email,
    );
    await expect(page).toHaveURL(/\/iniciar-sesion/);
    await expect(sidebar(page)).toHaveCount(0);
  });

  test("refuses a state change from an untrusted origin and keeps the session (ADR-0084)", async ({
    page,
  }) => {
    await signIn(page);

    // The browser's cookie jar is sent, but the Origin is not the admin web's.
    const refused = await page.request.delete(sessionPath, {
      headers: { Origin: "https://attacker.example" },
    });
    expect(refused.status()).toBe(403);
    expect(await refused.json()).toMatchObject({ code: "untrusted_origin" });

    // Nothing changed: the session still opens every page.
    await sidebar(page).getByRole("link", { name: "Planes" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Planes" }),
    ).toBeVisible();
    const current = await page.request.get(sessionPath, {
      headers: { Origin: webOrigin },
    });
    expect(current.status()).toBe(200);
  });
});
