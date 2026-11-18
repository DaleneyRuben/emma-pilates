import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { centro } from "../../test/booking-handlers";
import {
  brokenSpring,
  equipmentHandlers,
  equipmentIssuesPath,
  equipmentPath,
  piece,
  reformer5,
  reformerType,
} from "../../test/equipment-fixtures";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import { renderAdmin } from "../../test/render-admin";
import {
  coordinatorHandlers,
  signedInHandlers,
} from "../../test/session-handlers";
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
const rowOf = (section: HTMLElement, name: RegExp) =>
  within(section).getByRole("row", { name });

const openAddReformer = async () => {
  const { user } = renderAdmin("/estudio/equipos");
  const reformers = await sectionOf(/^Reformer ·/);
  await user.click(within(reformers).getByRole("button", { name: "Agregar" }));
  const panel = await screen.findByRole("dialog", { name: "Agregar Reformer" });
  return { user, panel, field: within(panel).getByLabelText("Número") };
};

// AW37 (BKO-004, FIX-067 option A): one section per equipment type.
describe("AW37 Equipos on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    bodies.length = 0;
    server.use(...signedInHandlers());
  });

  it("draws one section per type in API order with its count and how it is kept", async () => {
    server.use(...equipmentHandlers());
    renderAdmin("/estudio/equipos");

    expect(
      await screen.findByText(
        "Sucursal Centro · 5 tipos de equipo · 3 fallas abiertas",
      ),
    ).toBeVisible();
    await sectionOf(/^Reformer ·/);
    const names = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent)
      .filter((text) => !text?.startsWith("Fallas"));
    expect(names).toEqual([
      "Reformer · 4 unidades",
      "Cadillac · 1 unidad",
      "Mat · 0 unidades",
      "Aros · 0 en total",
      "Balones · 12 en total",
    ]);

    const reformers = await sectionOf(/^Reformer ·/);
    expect(within(reformers).getByText("Con número")).toBeInTheDocument();
    expect(
      within(rowOf(reformers, /Reformer 5/)).getByText("Fuera de servicio"),
    ).toBeInTheDocument();
    expect(
      within(rowOf(reformers, /Reformer 2/)).getByText("Con falla"),
    ).toBeInTheDocument();
    expect(
      within(rowOf(reformers, /Reformer 1/)).getByText("Funciona"),
    ).toBeInTheDocument();
    expect(
      within(await sectionOf(/^Mat ·/)).getByText(
        "Sin unidades en esta sucursal.",
      ),
    ).toBeInTheDocument();

    const balls = await sectionOf(/^Balones ·/);
    expect(within(balls).getByText("Por cantidad")).toBeInTheDocument();
    expect(within(balls).getByText("en esta sucursal")).toBeInTheDocument();
    expect(within(balls).getByText("11 se pueden usar")).toBeInTheDocument();
    expect(within(balls).getByText("1 dañado")).toBeInTheDocument();
    expect(
      within(balls).queryByRole("button", { name: "Agregar" }),
    ).not.toBeInTheDocument();
    expect(
      within(await sectionOf(/^Aros ·/)).getByRole("button", {
        name: "Registrar daño",
      }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Nuevo equipo" }),
    ).not.toBeInTheDocument();
  });

  it("lists unit faults and stock damage together in Fallas abiertas", async () => {
    server.use(...equipmentHandlers());
    renderAdmin("/estudio/equipos");
    const faults = await sectionOf(/^Fallas abiertas · 3/);
    expect(
      await within(faults).findByText(brokenSpring.description),
    ).toBeInTheDocument();
    expect(
      within(faults).getByText(/Reportó Emma Vargas · 22\/10\/2026/),
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

  it("opens Agregar with the type's first free number and adds the unit", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPost(equipmentPath, () => jsonResponse(piece("reformer", 4), 201)),
    );
    const { user, panel, field } = await openAddReformer();
    expect(field).toHaveValue("4");
    expect(
      within(panel).getByText("Se mostrará como Reformer 4."),
    ).toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: "Agregar" }));
    expect(await screen.findByText("Agregamos Reformer 4.")).toBeVisible();
    expect(bodies).toEqual([
      { branchId: centro.id, typeId: reformerType.id, number: 4 },
    ]);
  });

  it("warns about a taken number while typing and blocks Agregar (finding 103)", async () => {
    server.use(...equipmentHandlers());
    const { user, panel, field } = await openAddReformer();
    await user.clear(field);
    await user.type(field, "1");
    expect(within(panel).getByRole("alert")).toHaveTextContent(
      "Ya hay un Reformer 1 en esta sucursal. El primer número libre es el 4.",
    );
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(
      within(panel).queryByText(/Se mostrará como/),
    ).not.toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Agregar" }),
    ).toBeDisabled();

    await user.clear(field);
    expect(
      within(panel).getByText("Del 1 al 99, único por tipo en esta sucursal."),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Agregar" }),
    ).toBeDisabled();

    await user.type(field, "7");
    expect(
      within(panel).getByText("Se mostrará como Reformer 7."),
    ).toBeInTheDocument();
    expect(within(panel).queryByRole("alert")).not.toBeInTheDocument();
    expect(field).toHaveAttribute("aria-invalid", "false");
    expect(
      within(panel).getByRole("button", { name: "Agregar" }),
    ).toBeEnabled();
  });

  it("keeps the server's refusal for a number taken meanwhile", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPost(equipmentPath, () =>
        problemResponse(409, "equipment_number_taken"),
      ),
    );
    const { user, panel } = await openAddReformer();
    await user.click(within(panel).getByRole("button", { name: "Agregar" }));
    expect(await within(panel).findByRole("alert")).toHaveTextContent(
      "Ya hay un Reformer 4 en esta sucursal.",
    );
  });

  it("records a fault from a row", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPost(`${equipmentPath}/${piece("reformer", 1).id}/issues`, () =>
        jsonResponse(brokenSpring, 201),
      ),
    );
    const { user } = renderAdmin("/estudio/equipos");
    const reformers = await sectionOf(/^Reformer ·/);
    await user.click(
      within(rowOf(reformers, /Reformer 1/)).getByRole("button", {
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

    const reformers = await sectionOf(/^Reformer ·/);
    await user.click(
      within(rowOf(reformers, /Reformer 5/)).getByRole("button", {
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
        /Resuelta por Paola Mendoza · 20\/10\/2026/,
      ),
    ).toBeInTheDocument();
    expect(within(faults).getByText("Balones · 2 dañados")).toBeInTheDocument();
    expect(
      within(faults).getByText(/Dada de baja por Paola Mendoza · 19\/10\/2026/),
    ).toBeInTheDocument();
    expect(
      within(faults).queryByRole("button", { name: "Marcar resuelta" }),
    ).not.toBeInTheDocument();
  });

  it("still shows every type in a Branch without equipment", async () => {
    server.use(...equipmentHandlers({ items: [], stocks: [], open: [] }));
    renderAdmin("/estudio/equipos");
    expect(
      await screen.findByText(
        "Sucursal Centro · 5 tipos de equipo · 0 fallas abiertas",
      ),
    ).toBeVisible();
    expect(
      await screen.findAllByText("Sin unidades en esta sucursal."),
    ).toHaveLength(3);
    expect(
      within(await sectionOf(/^Balones ·/)).getByText("0 se pueden usar"),
    ).toBeInTheDocument();
  });
});

describe("AW37 Equipos for a Coordinator", () => {
  useMockServer();
  beforeEach(() => server.use(...coordinatorHandlers()));

  it("adds units but neither creates nor edits types", async () => {
    server.use(...equipmentHandlers());
    renderAdmin("/estudio/equipos");
    const reformers = await sectionOf(/^Reformer ·/);
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

  it("keeps the sections and its destination in the drawer", async () => {
    server.use(...equipmentHandlers());
    const { user } = renderAdmin("/estudio/equipos");
    await sectionOf(/^Reformer ·/);
    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(
      within(await screen.findByRole("dialog", { name: "Menú" })).getByRole(
        "link",
        { name: "Estudio" },
      ),
    ).toHaveAttribute("aria-current", "page");
  });
});
