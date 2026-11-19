import { expect, test, type Locator, type Page } from "@playwright/test";
import { signIn } from "./support/session";

// The first «Bs …» a tile shows, as centavos; «−Bs» is a negative Quedó.
const centavosOf = async (tile: Locator): Promise<number> => {
  const text = await tile.innerText();
  // FIX-090: whole amounts drop their ,00.
  const match = /(−?)Bs ([\d.]+)(?:,(\d{2}))?/.exec(text);
  if (match === null) throw new Error(`No amount in «${text}»`);
  const units = Number((match[2] ?? "").replaceAll(".", ""));
  const value = units * 100 + Number(match[3] ?? 0);
  return match[1] === "−" ? -value : value;
};

const tile = (page: Page, name: string) => page.getByRole("region", { name });

// AW16 through the real backend: the three figures agree with each other,
// one Branch counts only its cash and its Expenses (Valeria's fixture cash
// payment at Centro), and the range is validated. Earlier journeys may have
// confirmed a transfer or recorded an Expense, so Todas las sucursales is
// checked by arithmetic, not by a fixed figure.
test("reports the studio's money and narrows it to one Branch", async ({
  page,
}) => {
  await signIn(page, "/informes/dinero");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Dinero",
    }),
  ).toBeVisible();
  await expect(page.getByText(/· Todas las sucursales$/)).toBeVisible();
  await expect(
    page.getByText("El reporte usa su propio filtro de sucursal"),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Sucursal" })).toHaveValue(
    "all",
  );
  // FIX-091 (W5 B): the page opens on «Este mes»; the fixture's payments
  // fall in the last six months.
  const period = page.getByRole("group", { name: "Período" });
  await expect(
    period.getByRole("button", { name: "Este mes" }),
  ).toHaveAttribute("aria-pressed", "true");
  await period.getByRole("button", { name: "Últimos 6 meses" }).click();
  await expect(page).toHaveURL(/from=\d{4}-\d{2}-01/);
  await expect(
    page.getByRole("table", { name: "Mes contra mes" }),
  ).toBeVisible();

  const income = tile(page, "Entró");
  await expect(income.getByText(/Bs [\d.]+/).first()).toBeVisible();
  const ingresos = await centavosOf(income);
  const gastos = await centavosOf(tile(page, "Salió"));
  const neto = await centavosOf(tile(page, "Quedó"));
  expect(ingresos).toBeGreaterThanOrEqual(78_000);
  expect(neto).toBe(ingresos - gastos);
  await expect(page.getByRole("figure", { name: "Mes por mes" })).toBeVisible();
  const months = page.getByRole("table", { name: "Totales por mes" });
  await expect(months).toBeVisible();
  const categories = page.getByRole("table", { name: "Gastos por categoría" });
  await expect(
    categories.getByText("Viene de Nómina, no de las categorías"),
  ).toBeVisible();

  await page.getByRole("combobox", { name: "Sucursal" }).selectOption({
    label: "Centro",
  });
  await expect(
    income.getByText("Pagos en efectivo cobrados en Centro"),
  ).toBeVisible();
  await expect(income.getByText("Bs 780")).toBeVisible();
  await expect(
    tile(page, "Salió").getByText("Gastos registrados en Centro"),
  ).toBeVisible();
  await expect(
    page.getByText(
      "La nómina y los ingresos por QR se ven solo en «Todas las sucursales».",
    ),
  ).toBeVisible();
  await expect(categories.getByText(/Nómina/)).toHaveCount(0);
  await expect(page.getByText(/· Sucursal Centro$/)).toBeVisible();
  await expect(page).toHaveURL(/branch=[0-9a-f-]{36}/);
  expect(await centavosOf(tile(page, "Quedó"))).toBe(
    78_000 - (await centavosOf(tile(page, "Salió"))),
  );

  // The range: a start after the end keeps the last report; an empty
  // range says so. «Elegir fechas» opens the fields.
  await period.getByRole("button", { name: "Elegir fechas" }).click();
  await page.getByLabel("Desde").fill("2031-01-01");
  await expect(
    page.getByText("La fecha inicial no puede ser posterior a la final."),
  ).toBeVisible();
  await expect(income.getByText("Bs 780")).toBeVisible();
  await page.getByLabel("Desde").fill("2020-01-01");
  await page.getByLabel("Hasta").fill("2020-01-31");
  await expect(
    page.getByText("Sin ingresos ni gastos en este rango."),
  ).toBeVisible();
  await expect(page).toHaveURL(/from=2020-01-01&to=2020-01-31/);
});
