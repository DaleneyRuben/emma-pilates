import { screen, within } from "@testing-library/react";
import { http } from "msw";
import {
  brokenSpring,
  equipmentHandlers,
  equipmentIssuesPath,
  equipmentPath,
  piece,
  reformer5,
} from "../../test/equipment-fixtures";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import {
  coordinatorHandlers,
  signedInHandlers,
} from "../../test/session-handlers";
import { typeDetail } from "../../test/equipment-table";
import { useNarrowViewport } from "../../test/viewport";

const bodies: unknown[] = [];
const recordPost = (path: string, respond: () => Response) =>
  http.post(apiUrl(path), async ({ request }) => {
    const text = await request.text();
    bodies.push(text === "" ? null : JSON.parse(text));
    return respond();
  });

const sectionOf = async (name: RegExp) =>
  (await screen.findByRole("region", { name })) as HTMLElement;
const unitOf = (detail: HTMLElement, name: string) =>
  within(detail).getByText(name).closest("li") as HTMLElement;

// AW37 (BKO-004, FIX-067 option A): one section per equipment type.
describe("AW37 Equipos on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    bodies.length = 0;
    server.use(...signedInHandlers());
  });

  it("draws one table row per type in API order with its counts", async () => {
    server.use(...equipmentHandlers());
    renderAdmin("/estudio/equipos");

    expect(
      await screen.findByText(
        "Sucursal Centro · 5 tipos de equipo · 3 fallas abiertas",
      ),
    ).toBeVisible();
    const table = await screen.findByRole("table", { name: "Equipos" });
    const rows = within(table)
      .getAllByRole("row")
      .slice(1)
      .map((row) =>
        within(row)
          .getAllByRole("cell")
          .map((cell) => cell.textContent),
      );
    expect(rows).toEqual([
      ["ReformerCon número", "4", "2", "2", "Ver Reformer"],
      ["CadillacCon número", "1", "1", "—", "Ver Cadillac"],
      ["MatCon número", "0", "0", "—", "Ver Mat"],
      ["ArosPor cantidad", "0", "0", "—", "Ver Aros"],
      ["BalonesPor cantidad", "12", "11", "1", "Ver Balones"],
    ]);
    expect(screen.queryByRole("region", { name: /^Reformer ·/ })).toBeNull();
  });

  it("opens a type's units and stock from its row", async () => {
    server.use(...equipmentHandlers());
    const { user } = renderAdmin("/estudio/equipos");

    const reformers = await typeDetail(user, "Reformer");
    expect(reformers).toHaveAccessibleName("Reformer · 4 unidades");
    expect(
      screen.getByRole("button", { name: "Ocultar Reformer" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      within(unitOf(reformers, "Reformer 5")).getByText("Fuera de servicio"),
    ).toBeInTheDocument();
    expect(
      within(unitOf(reformers, "Reformer 2")).getByText("Con falla"),
    ).toBeInTheDocument();
    expect(
      within(unitOf(reformers, "Reformer 1")).getByText("Funciona"),
    ).toBeInTheDocument();
    expect(
      within(await typeDetail(user, "Mat")).getByText(
        "Sin unidades en esta sucursal.",
      ),
    ).toBeInTheDocument();

    const balls = await typeDetail(user, "Balones");
    expect(within(balls).getByText("en esta sucursal")).toBeInTheDocument();
    expect(within(balls).getByText("11 se pueden usar")).toBeInTheDocument();
    expect(within(balls).getByText("1 dañado")).toBeInTheDocument();
    expect(
      within(balls).queryByRole("button", { name: "Agregar" }),
    ).not.toBeInTheDocument();
    expect(
      within(await typeDetail(user, "Aros")).getByRole("button", {
        name: "Registrar daño",
      }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Nuevo equipo" }),
    ).not.toBeInTheDocument();
  });

  it("puts the faults above the equipment table", async () => {
    server.use(...equipmentHandlers());
    renderAdmin("/estudio/equipos");
    const faults = await sectionOf(/^Fallas abiertas · 3/);
    const table = await screen.findByRole("table", { name: "Equipos" });
    expect(
      faults.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("lists unit faults and stock damage together in Fallas abiertas", async () => {
    server.use(...equipmentHandlers());
    renderAdmin("/estudio/equipos");
    const faults = await sectionOf(/^Fallas abiertas · 3/);
    expect(
      await within(faults).findByText(brokenSpring.description),
    ).toBeInTheDocument();
    expect(
      within(faults).getByText(/Reportó Emma Vargas · jue 22 oct/),
    ).toBeInTheDocument();
    expect(within(faults).getByText("Reformer 5")).toBeInTheDocument();
    expect(within(faults).getByText("Fuera de servicio")).toBeInTheDocument();
    const damage = within(faults)
      .getByText("Balones · 1 dañado")
      .closest("li") as HTMLElement;
    expect(
      within(damage).getByRole("button", { name: "Dar de baja" }),
    ).toBeInTheDocument();
    expect(
      within(damage).getByRole("button", { name: "Marcar resuelta" }),
    ).toBeInTheDocument();
    expect(
      within(faults).getAllByRole("button", { name: "Dar de baja" }),
    ).toHaveLength(1);
  });

  it("records a fault from a row", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPost(`${equipmentPath}/${piece("reformer", 1).id}/issues`, () =>
        jsonResponse(brokenSpring, 201),
      ),
    );
    const { user } = renderAdmin("/estudio/equipos");
    const reformers = await typeDetail(user, "Reformer");
    await user.click(
      within(unitOf(reformers, "Reformer 1")).getByRole("button", {
        name: "Registrar falla",
      }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Registrar falla · Reformer 1",
    });
    await user.type(
      within(panel).getByLabelText("¿Qué pasó?"),
      "La plataforma no frena.",
    );
    await user.click(within(panel).getByLabelText("No se puede usar"));
    await user.click(within(panel).getByRole("button", { name: "Registrar" }));
    expect(
      await screen.findByText("Registramos la falla de Reformer 1."),
    ).toBeVisible();
    expect(bodies).toEqual([
      { description: "La plataforma no frena.", outOfService: true },
    ]);
  });

  it("resolves a fault and retires a unit after asking", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPost(`${equipmentIssuesPath}/${brokenSpring.id}/resolve`, () =>
        jsonResponse({
          ...brokenSpring,
          resolvedAt: "2026-10-23T14:00:00.000Z",
        }),
      ),
      recordPost(`${equipmentPath}/${reformer5.id}/archive`, () =>
        jsonResponse({ ...reformer5, archivedAt: "2026-10-23T14:00:00.000Z" }),
      ),
    );
    const { user } = renderAdmin("/estudio/equipos");
    const faults = await sectionOf(/^Fallas/);
    const spring = (await within(faults).findByText("Reformer 5")).closest(
      "li",
    ) as HTMLElement;
    await user.click(
      within(spring).getByRole("button", { name: "Marcar resuelta" }),
    );
    const confirm = await screen.findByRole("alertdialog", {
      name: "¿Marcar resuelta la falla de Reformer 5?",
    });
    await user.click(
      within(confirm).getByRole("button", { name: "Marcar resuelta" }),
    );
    expect(
      await screen.findByText("Marcamos resuelta la falla de Reformer 5."),
    ).toBeVisible();

    const reformers = await typeDetail(user, "Reformer");
    await user.click(
      within(unitOf(reformers, "Reformer 5")).getByRole("button", {
        name: "Dar de baja",
      }),
    );
    await user.click(
      within(
        await screen.findByRole("alertdialog", {
          name: "¿Dar de baja Reformer 5?",
        }),
      ).getByRole("button", { name: "Dar de baja" }),
    );
    expect(await screen.findByText("Dimos de baja Reformer 5.")).toBeVisible();
    expect(bodies).toEqual([null, null]);
  });

  it("shows the resolved faults with who resolved or wrote them off", async () => {
    server.use(...equipmentHandlers());
    const { user } = renderAdmin("/estudio/equipos");
    const faults = await sectionOf(/^Fallas/);
    await user.click(within(faults).getByRole("radio", { name: "Resueltas" }));
    expect(
      await within(faults).findByText(
        /Resuelta por Paola Mendoza · mar 20 oct/,
      ),
    ).toBeInTheDocument();
    expect(within(faults).getByText("Balones · 2 dañados")).toBeInTheDocument();
    expect(
      within(faults).getByText(/Dada de baja por Paola Mendoza · lun 19 oct/),
    ).toBeInTheDocument();
    expect(
      within(faults).queryByRole("button", { name: "Marcar resuelta" }),
    ).not.toBeInTheDocument();
  });

  it("still shows every type in a Branch without equipment", async () => {
    server.use(...equipmentHandlers({ items: [], stocks: [], open: [] }));
    const { user } = renderAdmin("/estudio/equipos");
    expect(
      await screen.findByText(
        "Sucursal Centro · 5 tipos de equipo · 0 fallas abiertas",
      ),
    ).toBeVisible();
    for (const name of ["Reformer", "Cadillac", "Mat"]) {
      expect(
        within(await typeDetail(user, name)).getByText(
          "Sin unidades en esta sucursal.",
        ),
      ).toBeInTheDocument();
    }
    expect(
      within(await typeDetail(user, "Balones")).getByText("0 se pueden usar"),
    ).toBeInTheDocument();
  });
});

describe("AW37 Equipos for a Coordinator", () => {
  useMockServer();
  beforeEach(() => server.use(...coordinatorHandlers()));

  it("adds units but neither creates nor edits types", async () => {
    server.use(...equipmentHandlers());
    const { user } = renderAdmin("/estudio/equipos");
    const reformers = await typeDetail(user, "Reformer");
    expect(
      within(reformers).getByRole("button", { name: "Agregar" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Nuevo tipo/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Editar/ }),
    ).not.toBeInTheDocument();
  });
});

describe("AW37 Equipos on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("keeps the table and its destination in the drawer", async () => {
    server.use(...equipmentHandlers());
    const { user } = renderAdmin("/estudio/equipos");
    await typeDetail(user, "Reformer");
    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(
      within(await screen.findByRole("dialog", { name: "Menú" })).getByRole(
        "link",
        { name: "Estudio" },
      ),
    ).toHaveAttribute("aria-current", "page");
  });
});
