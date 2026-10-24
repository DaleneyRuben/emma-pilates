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
import { useNarrowViewport } from "../../test/viewport";

const bodies: unknown[] = [];
const recordPost = (path: string, respond: () => Response) =>
  http.post(apiUrl(path), async ({ request }) => {
    const text = await request.text();
    bodies.push(text === "" ? null : JSON.parse(text));
    return respond();
  });

const heading = () =>
  screen.findByRole("heading", { level: 1, name: "Equipos" });
const sectionOf = async (name: RegExp) =>
  (await screen.findByRole("region", { name })) as HTMLElement;

// AW37 (BKO-004): the selected Branch's Equipment and its faults.
describe("AW37 Equipos on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    bodies.length = 0;
    server.use(...signedInHandlers());
  });

  it("lists the Equipment by kind with its state and the open faults", async () => {
    server.use(...equipmentHandlers());
    renderAdmin("/back-office/equipos");
    await heading();

    expect(
      await screen.findByText(
        "Sucursal Centro · 4 equipos · 1 fuera de servicio",
      ),
    ).toBeVisible();
    const reformers = await sectionOf(/^Reformers/);
    const row = within(reformers).getByRole("row", { name: /Reformer 5/ });
    expect(within(row).getByText("Fuera de servicio")).toBeInTheDocument();
    expect(
      within(
        within(reformers).getByRole("row", { name: /Reformer 2/ }),
      ).getByText("Con falla"),
    ).toBeInTheDocument();
    expect(
      within(
        within(reformers).getByRole("row", { name: /Reformer 1/ }),
      ).getByText("Funciona"),
    ).toBeInTheDocument();
    expect(
      within(await sectionOf(/^Mats/)).getByText("Sin mats registrados."),
    ).toBeInTheDocument();

    const faults = await sectionOf(/^Fallas/);
    expect(
      within(faults).getByText(brokenSpring.description),
    ).toBeInTheDocument();
    expect(
      within(faults).getByText(/Reportó Emma Vargas · 22\/10\/2026/),
    ).toBeInTheDocument();
    expect(within(faults).getByText("Se puede usar")).toBeInTheDocument();
  });

  it("registers a piece and points at a taken number", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPost(equipmentPath, () =>
        bodies.length === 1
          ? problemResponse(409, "equipment_number_taken")
          : jsonResponse(piece("reformer", 9), 201),
      ),
    );
    const { user } = renderAdmin("/back-office/equipos");
    await sectionOf(/^Reformers/);

    await user.click(screen.getByRole("button", { name: "Nuevo equipo" }));
    const panel = await screen.findByRole("dialog", { name: "Nuevo equipo" });
    await user.type(within(panel).getByLabelText("Número"), "5");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(
      await within(panel).findByText("Ya hay un Reformer 5 en esta sucursal."),
    ).toBeInTheDocument();

    await user.clear(within(panel).getByLabelText("Número"));
    await user.type(within(panel).getByLabelText("Número"), "9");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Agregamos Reformer 9.")).toBeVisible();
    expect(bodies.at(-1)).toEqual({
      branchId: centro.id,
      kind: "reformer",
      number: 9,
    });
  });

  it("records a fault from a row", async () => {
    server.use(
      ...equipmentHandlers(),
      recordPost(`${equipmentPath}/${piece("reformer", 1).id}/issues`, () =>
        jsonResponse(brokenSpring, 201),
      ),
    );
    const { user } = renderAdmin("/back-office/equipos");
    const reformers = await sectionOf(/^Reformers/);
    await user.click(
      within(
        within(reformers).getByRole("row", { name: /Reformer 1/ }),
      ).getByRole("button", { name: "Registrar falla" }),
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

  it("resolves a fault and retires a piece after asking", async () => {
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
    const { user } = renderAdmin("/back-office/equipos");
    const faults = await sectionOf(/^Fallas/);
    await user.click(
      (
        await within(faults).findAllByRole("button", {
          name: "Marcar resuelta",
        })
      )[0]!,
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

    const reformers = await sectionOf(/^Reformers/);
    await user.click(
      within(
        within(reformers).getByRole("row", { name: /Reformer 5/ }),
      ).getByRole("button", { name: "Dar de baja" }),
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

  it("shows the resolved faults with who resolved them", async () => {
    server.use(...equipmentHandlers());
    const { user } = renderAdmin("/back-office/equipos");
    const faults = await sectionOf(/^Fallas/);
    await user.click(within(faults).getByRole("radio", { name: "Resueltas" }));
    expect(
      await within(faults).findByText(
        /Resuelta por Paola Mendoza · 20\/10\/2026/,
      ),
    ).toBeInTheDocument();
    expect(
      within(faults).queryByRole("button", { name: "Marcar resuelta" }),
    ).not.toBeInTheDocument();
  });

  it("says when the Branch has no Equipment yet", async () => {
    server.use(...equipmentHandlers([], [], []));
    renderAdmin("/back-office/equipos");
    expect(
      await screen.findByText("Todavía no hay equipos en esta sucursal."),
    ).toBeInTheDocument();
  });
});

describe("AW37 Equipos on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("keeps the sections and the sidebar entry in the drawer", async () => {
    server.use(...equipmentHandlers());
    const { user } = renderAdmin("/back-office/equipos");
    await sectionOf(/^Reformers/);
    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(
      await screen.findByRole("link", { name: "Equipos" }),
    ).toBeInTheDocument();
  });
});
