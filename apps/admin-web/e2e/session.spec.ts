import { expect, test } from "@playwright/test";
import { fixtures, webOrigin } from "./support/environment";
import { sidebar, signIn, trackApiRequests } from "./support/session";

const sessionPath = "/api/v1/admin-web/authentication-sessions/current";

test.describe("Administrator sessions (AW01, AW33, ADR-0084)", () => {
  test("signs in to Horario with a host-only HttpOnly cookie and logs out from the menu", async ({
    page,
    context,
  }) => {
    await signIn(page);
    await expect(
      page.getByRole("heading", { level: 1, name: "Horario" }),
    ).toBeVisible();

    const session = (await context.cookies(webOrigin)).find(
      (cookie) => cookie.name === "__Host-emma-admin-session",
    );
    expect(session).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      domain: "localhost",
    });
    expect(await page.evaluate(() => document.cookie)).toBe("");

    await page
      .getByRole("button", {
        name: `Tu cuenta: ${fixtures.administrator.name}`,
      })
      .click();
    const menu = page.getByRole("dialog", { name: "Tu cuenta" });
    await menu.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(menu.getByText("¿Cerrar sesión?")).toBeVisible();
    await menu.getByRole("button", { name: "Cerrar sesión" }).click();

    await expect(
      page.getByRole("button", { name: "Iniciar sesión" }),
    ).toBeVisible();
    expect(
      (await context.cookies(webOrigin)).some(
        (cookie) => cookie.name === "__Host-emma-admin-session",
      ),
    ).toBe(false);

    // The old address needs a session again.
    await page.goto("/back-office/gastos");
    await expect(page).toHaveURL(/\/iniciar-sesion\?redirect=/);
  });

  test("sends a signed-out visitor to Login and returns them to the address they wanted", async ({
    page,
  }) => {
    await page.goto("/catalogo/planes?page=2");
    await expect(page).toHaveURL(/\/iniciar-sesion\?redirect=/);
    await expect(sidebar(page)).toHaveCount(0);

    await signIn(page, "/catalogo/planes?page=2");

    await expect(page).toHaveURL(
      `${webOrigin}/catalogo/planes?page=2&pageSize=20&visibility=all`,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Planes" }),
    ).toBeVisible();
  });

  test("returns to Login with a notice when the session ends and comes back to the same page", async ({
    page,
  }) => {
    const api = trackApiRequests(page);
    await signIn(page, "/back-office/gastos");
    await expect(
      page.getByRole("heading", { level: 1, name: "Gastos" }),
    ).toBeVisible();
    // The heading shows while the Branches still load; Gastos and the
    // sidebar ask for the rest only then, and a 401 on any of them would
    // reach Login before the click below (WEB-026).
    await expect(
      page.getByText(/^(Sin resultados|Mostrando .+)$/),
    ).toBeVisible();
    await api.settled();

    // The session is revoked behind the browser's back (the backend ends it
    // the same way after 30 idle minutes); the cookie jar is shared.
    const revoked = await page.request.delete(sessionPath, {
      headers: { Origin: webOrigin },
    });
    expect(revoked.status()).toBe(204);

    await sidebar(page).getByRole("link", { name: "Nómina" }).click();

    await expect(
      page.getByText("Tu sesión terminó. Vuelve a iniciar sesión."),
    ).toBeVisible();
    await expect(page).toHaveURL(/notice=session-ended/);

    await page
      .getByLabel("Correo electrónico")
      .fill(fixtures.administrator.email);
    await page.getByLabel("Contraseña").fill(fixtures.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "Nómina" }),
    ).toBeVisible();
    await expect(page).toHaveURL(
      `${webOrigin}/back-office/nomina?page=1&pageSize=20`,
    );
  });
});
