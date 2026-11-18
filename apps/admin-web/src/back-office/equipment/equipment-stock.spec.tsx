import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { centro } from "../../test/booking-handlers";
import {
  ballsType,
  branchStocks,
  equipmentHandlers,
  equipmentIssuesPath,
  equipmentStocksPath,
  flatBall,
  ringsType,
  stock,
} from "../../test/equipment-fixtures";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const bodies: unknown[] = [];
const record =
  (method: "post" | "put") => (path: string, respond: () => Response) =>
    http[method](apiUrl(path), async ({ request }) => {
      const text = await request.text();
      bodies.push(text === "" ? null : JSON.parse(text));
      return respond();
    });
const recordPost = record("post");
const recordPut = record("put");

const ballsSection = async () =>
  (await screen.findByRole("region", { name: /^Balones ·/ })) as HTMLElement;

const openOnBalls = async (action: string, title: string) => {
  const { user } = renderAdmin("/estudio/equipos");
  await user.click(
    within(await ballsSection()).getByRole("button", { name: action }),
  );
  return { user, panel: await screen.findByRole("dialog", { name: title }) };
};

// FIX-067 (finding 101, option A): a type kept by quantity.
describe("AW37 equipment kept by quantity", () => {
  useMockServer();
  beforeEach(() => {
    bodies.length = 0;
    server.use(...signedInHandlers());
  });

  it("registers damage within the usable count", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPost(`${equipmentStocksPath}/damage`, () =>
        jsonResponse({ ...flatBall, quantity: 2 }, 201),
      ),
    );
    const { user, panel } = await openOnBalls(
      "Registrar daño",
      "Registrar daño · Balones",
    );
    const count = within(panel).getByRole("group", { name: "¿Cuántos?" });
    expect(within(count).getByText("1")).toBeInTheDocument();
    expect(
      within(count).getByRole("button", { name: "Uno menos" }),
    ).toBeDisabled();
    expect(
      within(panel).getByText("De 11 que se pueden usar."),
    ).toBeInTheDocument();
    await user.click(within(count).getByRole("button", { name: "Uno más" }));
    expect(within(count).getByText("2")).toBeInTheDocument();

    await user.click(
      within(panel).getByRole("button", { name: "Registrar daño" }),
    );
    expect(within(panel).getByRole("alert")).toHaveTextContent(
      "Cuenta qué pasó.",
    );
    await user.type(
      within(panel).getByLabelText("¿Qué pasó?"),
      "Dos se pincharon.",
    );
    await user.click(
      within(panel).getByRole("button", { name: "Registrar daño" }),
    );
    expect(
      await screen.findByText("Registramos 2 dañados en Balones."),
    ).toBeVisible();
    expect(bodies).toEqual([
      {
        branchId: centro.id,
        typeId: ballsType.id,
        quantity: 2,
        description: "Dos se pincharon.",
      },
    ]);
  });

  it("stops the count at the usable units", async () => {
    server.use(...equipmentHandlers({ stocks: [stock(ballsType, 3, 1)] }));
    const { user, panel } = await openOnBalls(
      "Registrar daño",
      "Registrar daño · Balones",
    );
    const count = within(panel).getByRole("group", { name: "¿Cuántos?" });
    await user.click(within(count).getByRole("button", { name: "Uno más" }));
    expect(
      within(count).getByRole("button", { name: "Uno más" }),
    ).toBeDisabled();
  });

  it("changes the quantity but never below the damaged", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPut(equipmentStocksPath, () =>
        jsonResponse(stock(ballsType, 14, 1)),
      ),
    );
    const { user, panel } = await openOnBalls(
      "Cambiar cantidad",
      "Cambiar cantidad · Balones",
    );
    expect(
      within(panel).getByText(
        "Cuenta también los dañados. Si se perdieron o se botaron, baja el número.",
      ),
    ).toBeInTheDocument();
    const field = within(panel).getByLabelText("Cantidad en Sucursal Centro");
    expect(field).toHaveValue("12");
    await user.clear(field);
    await user.type(field, "0");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(within(panel).getByRole("alert")).toHaveTextContent(
      "No puede ser menor que los dañados (1).",
    );
    expect(bodies).toEqual([]);

    await user.clear(field);
    await user.type(field, "14");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Balones: ahora son 14.")).toBeVisible();
    expect(bodies).toEqual([
      { branchId: centro.id, typeId: ballsType.id, quantity: 14 },
    ]);
  });

  it("explains the server's refusal for a quantity below the damaged with the fresh count", async () => {
    let stocks = branchStocks;
    server.use(
      http.get(apiUrl(equipmentStocksPath), () =>
        jsonResponse({ items: stocks }),
      ),
      ...equipmentHandlers(),
      recordPut(equipmentStocksPath, () => {
        stocks = [stock(ringsType, 0), stock(ballsType, 12, 3)];
        return problemResponse(409, "equipment_quantity_below_damaged");
      }),
    );
    const { user, panel } = await openOnBalls(
      "Cambiar cantidad",
      "Cambiar cantidad · Balones",
    );
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "No puede ser menor que los dañados (3).",
    );
  });

  it("explains the damage refusal with the fresh usable count", async () => {
    let stocks = branchStocks;
    server.use(
      http.get(apiUrl(equipmentStocksPath), () =>
        jsonResponse({ items: stocks }),
      ),
      ...equipmentHandlers(),
      recordPost(`${equipmentStocksPath}/damage`, () => {
        stocks = [stock(ringsType, 0), stock(ballsType, 12, 8)];
        return problemResponse(409, "equipment_damage_exceeds_usable");
      }),
    );
    const { user, panel } = await openOnBalls(
      "Registrar daño",
      "Registrar daño · Balones",
    );
    await user.type(
      within(panel).getByLabelText("¿Qué pasó?"),
      "Se pincharon.",
    );
    await user.click(
      within(panel).getByRole("button", { name: "Registrar daño" }),
    );
    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "Solo hay 4 que se pueden usar.",
    );
    expect(
      within(panel).getByText("De 4 que se pueden usar."),
    ).toBeInTheDocument();
  });

  it("writes damaged units off the total after asking", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPost(`${equipmentIssuesPath}/${flatBall.id}/write-off`, () =>
        jsonResponse({ ...flatBall, writtenOff: true }),
      ),
    );
    const { user } = renderAdmin("/estudio/equipos");
    const faults = await screen.findByRole("region", { name: /^Fallas/ });
    const damage = (
      await within(faults).findByText("Balones · 1 dañado")
    ).closest("li") as HTMLElement;
    await user.click(
      within(damage).getByRole("button", { name: "Dar de baja" }),
    );
    const confirm = await screen.findByRole("alertdialog", {
      name: "¿Dar de baja 1 dañado de Balones?",
    });
    await user.click(
      within(confirm).getByRole("button", { name: "Dar de baja" }),
    );
    expect(
      await screen.findByText("Dimos de baja 1 dañado de Balones."),
    ).toBeVisible();
    expect(bodies).toEqual([null]);
  });

  it("marks damage resolved so the units count as usable again", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPost(`${equipmentIssuesPath}/${flatBall.id}/resolve`, () =>
        jsonResponse({ ...flatBall, resolvedAt: "2026-10-23T16:00:00.000Z" }),
      ),
    );
    const { user } = renderAdmin("/estudio/equipos");
    const faults = await screen.findByRole("region", { name: /^Fallas/ });
    const damage = (
      await within(faults).findByText("Balones · 1 dañado")
    ).closest("li") as HTMLElement;
    await user.click(
      within(damage).getByRole("button", { name: "Marcar resuelta" }),
    );
    const confirm = await screen.findByRole("alertdialog", {
      name: "¿Marcar resuelta la falla de Balones?",
    });
    expect(
      within(confirm).getByText("Vuelven a contar como que se pueden usar."),
    ).toBeInTheDocument();
    await user.click(
      within(confirm).getByRole("button", { name: "Marcar resuelta" }),
    );
    expect(
      await screen.findByText("Marcamos resuelta la falla de Balones."),
    ).toBeVisible();
  });
});
