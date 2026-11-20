import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { signIn, trackApiRequests } from "./support/session";
import { collectTexts, findTypeProblems } from "./support/type-audit";

/**
 * Follow-up 285: every text on every admin page keeps to the type scale
 * (the rules of design/v3/sistema/revisor/revisar.cjs) and passes axe's
 * colour contrast, at 1440 and at 420 px.
 */
const signedInRoutes = [
  "/",
  "/horario",
  "/horario/nutricion",
  "/clientas",
  "/clientas/para-contactar",
  "/clientas/congelamientos",
  "/promociones",
  "/promociones/clases-de-campana",
  "/promociones/referidos",
  "/comentarios",
  "/dinero/pagos",
  "/dinero/caja",
  "/dinero/sueldos",
  "/dinero/sueldos/pagados",
  "/dinero/gastos",
  "/estudio/personal",
  "/estudio/insumos",
  "/estudio/insumos/retiros",
  "/estudio/equipos",
  "/informes",
  "/informes/dinero",
  "/informes/simulador",
  "/ajustes/tipos-de-clase",
  "/ajustes/planes",
  "/ajustes/sucursales",
  "/ajustes/reglas-del-estudio",
  "/ajustes/qr-del-estudio",
];

const publicRoutes = [
  "/iniciar-sesion",
  "/recuperar-contrasena",
  "/crear-contrasena",
  "/confirmar-correo",
];

async function audit(page: Page, narrow: boolean): Promise<string[]> {
  // Nothing hovered: a row's hover fill would be measured half-way through
  // its transition.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  const texts = await collectTexts(page);
  const type = findTypeProblems(texts, narrow).map(
    ({ text, problems }) => `«${text}» ${problems.join("; ")}`,
  );
  const axe = await new AxeBuilder({ page })
    .withRules(["color-contrast"])
    .analyze();
  const contrast = axe.violations.flatMap(({ nodes }) =>
    nodes.map((node) => `contrast: ${node.target.join(" ")}`),
  );
  // The before and after figures of the PR come from this line.
  console.log(
    `type-audit ${new URL(page.url()).pathname} ${narrow ? 420 : 1440}: ${texts.length} texts, ${type.length} off the rules, ${contrast.length} contrast`,
  );
  return [...type, ...contrast];
}

async function settle(page: Page, path: string) {
  const requests = trackApiRequests(page);
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.locator(".carga-area")).toHaveCount(0);
  await requests.settled();
}

for (const width of [1440, 420]) {
  const narrow = width <= 420;

  test.describe(`the type scale at ${width} px`, () => {
    // One signed-in page for the routes; a failed route only re-signs in.
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      // axe needs a page from an explicit context.
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        locale: "es-BO",
        timezoneId: "Europe/Madrid",
      });
      page = await context.newPage();
      await signIn(page);
    });

    test.afterAll(async () => {
      await page.context().close();
    });

    for (const path of signedInRoutes) {
      test(path, async () => {
        await settle(page, path);
        expect(await audit(page, narrow)).toEqual([]);
      });
    }

    for (const path of publicRoutes) {
      test(`${path} (signed out)`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          locale: "es-BO",
        });
        const visitor = await context.newPage();
        await visitor.goto(path);
        await expect(
          visitor.getByRole("heading", { level: 1 }).first(),
        ).toBeVisible();
        expect(await audit(visitor, narrow)).toEqual([]);
        await context.close();
      });
    }
  });
}
