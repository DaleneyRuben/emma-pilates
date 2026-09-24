import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { page } from "../../test/booking-handlers";
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

const classTypesPath = "/api/v1/administrator/class-types";

const reformer = {
  id: "5d0c7a4e-3b1f-5b7a-8c2d-000000000001",
  name: "Reformer Pilates",
  description: "Trabajo de fuerza y control en la máquina.",
  durationMinutes: 50,
  defaultCapacity: 10,
  equipmentNeeds: "Reformer",
  archivedAt: null,
};
const mat = {
  id: "5d0c7a4e-3b1f-5b7a-8c2d-000000000002",
  name: "Mat Pilates",
  description: "Clase en colchoneta.",
  durationMinutes: 45,
  defaultCapacity: 14,
  equipmentNeeds: null,
  archivedAt: null,
};

const reads: URLSearchParams[] = [];
const classTypeTable = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(classTypesPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    return respond(params);
  });

describe("AW06 Tipos de clase on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers());
  });

  it("lists Class Types with duration, capacity, and equipment, filtered from the address", async () => {
    server.use(classTypeTable(() => jsonResponse(page([mat, reformer]))));
    const { router, user } = renderAdmin("/catalogo/tipos-de-clase");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Tipos de clase" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Cargando tipos de clase…")).toBeInTheDocument();
    const row = (await screen.findByRole("cell", { name: /Reformer Pilates/ }))
      .parentElement as HTMLElement;
    expect(within(row).getByRole("cell", { name: "50 min" })).toHaveAttribute(
      "data-label",
      "Duración",
    );
    expect(within(row).getByRole("cell", { name: "10" })).toBeInTheDocument();
    expect(
      within(row).getByText("Trabajo de fuerza y control en la máquina."),
    ).toBeInTheDocument();
    const matRow = screen.getByRole("cell", { name: /Mat Pilates/ })
      .parentElement as HTMLElement;
    expect(within(matRow).getByRole("cell", { name: "—" })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Estado"), "archived");
    await waitFor(() => expect(reads.at(-1)?.get("status")).toBe("archived"));
    expect(router.state.matches.at(-1)?.search).toMatchObject({
      status: "archived",
      page: 1,
    });
  });

  it("shows the empty, failed, and forbidden states", async () => {
    server.use(classTypeTable(() => jsonResponse(page([]))));
    const { user } = renderAdmin("/catalogo/tipos-de-clase");
    expect(
      await screen.findByText("No hay tipos de clase con este filtro."),
    ).toBeInTheDocument();

    server.use(
      classTypeTable(() =>
        problemResponse(403, "administration_access_denied"),
      ),
    );
    await user.selectOptions(screen.getByLabelText("Estado"), "all");
    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Nuevo tipo de clase" }),
    ).not.toBeInTheDocument();
  });

  it("creates a Class Type with its required description and converts the numbers", async () => {
    let body: unknown;
    server.use(
      classTypeTable(() => jsonResponse(page([reformer]))),
      http.post(apiUrl(classTypesPath), async ({ request }) => {
        body = await request.json();
        return jsonResponse({ ...mat, id: "new" }, 201);
      }),
    );
    const { user } = renderAdmin("/catalogo/tipos-de-clase");
    await screen.findByRole("cell", { name: /Reformer Pilates/ });

    await user.click(
      screen.getByRole("button", { name: "Nuevo tipo de clase" }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Nuevo tipo de clase",
    });
    await user.type(within(panel).getByLabelText("Nombre"), "Mat Pilates");
    await user.type(within(panel).getByLabelText("Duración"), "3");
    await user.type(within(panel).getByLabelText("Capacidad"), "14");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      within(panel).getByLabelText("Descripción"),
    ).toHaveAccessibleDescription(
      expect.stringContaining("Escribe una descripción."),
    );
    expect(
      within(panel).getByLabelText("Duración"),
    ).toHaveAccessibleDescription(
      expect.stringContaining("Entre 5 y 240 minutos."),
    );

    await user.type(
      within(panel).getByLabelText("Descripción"),
      "Clase en colchoneta.",
    );
    await user.clear(within(panel).getByLabelText("Duración"));
    await user.type(within(panel).getByLabelText("Duración"), "45");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(body).toEqual({
        name: "Mat Pilates",
        description: "Clase en colchoneta.",
        durationMinutes: 45,
        defaultCapacity: 14,
        equipmentNeeds: null,
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Nuevo tipo de clase" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("marks a taken name on its field", async () => {
    server.use(
      classTypeTable(() => jsonResponse(page([reformer]))),
      http.post(apiUrl(classTypesPath), () =>
        problemResponse(409, "class_type_name_taken"),
      ),
    );
    const { user } = renderAdmin("/catalogo/tipos-de-clase");
    await screen.findByRole("cell", { name: /Reformer Pilates/ });
    await user.click(
      screen.getByRole("button", { name: "Nuevo tipo de clase" }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Nuevo tipo de clase",
    });

    await user.type(within(panel).getByLabelText("Nombre"), "Reformer Pilates");
    await user.type(within(panel).getByLabelText("Descripción"), "Otra.");
    await user.type(within(panel).getByLabelText("Duración"), "50");
    await user.type(within(panel).getByLabelText("Capacidad"), "10");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(
        within(panel).getByLabelText("Nombre"),
      ).toHaveAccessibleDescription(
        "Ya existe un tipo de clase activo con ese nombre.",
      ),
    );
  });

  it("edits a Class Type without rewriting scheduled Sessions and explains a refused archive", async () => {
    let body: unknown;
    server.use(
      classTypeTable(() => jsonResponse(page([reformer]))),
      http.put(
        apiUrl(`${classTypesPath}/${reformer.id}`),
        async ({ request }) => {
          body = await request.json();
          return jsonResponse(reformer);
        },
      ),
      http.post(apiUrl(`${classTypesPath}/${reformer.id}/archive`), () =>
        problemResponse(409, "class_type_in_use"),
      ),
    );
    const { user } = renderAdmin("/catalogo/tipos-de-clase");
    await user.click(
      await screen.findByRole("button", { name: "Reformer Pilates" }),
    );
    const panel = await screen.findByRole("dialog", {
      name: "Editar tipo de clase",
    });
    expect(within(panel).getByLabelText("Equipo necesario")).toHaveValue(
      "Reformer",
    );
    expect(
      within(panel).getByText(
        "Los cambios se aplican a las sesiones que se generen desde ahora; las ya programadas no cambian.",
      ),
    ).toBeInTheDocument();

    await user.click(
      within(panel).getByRole("button", { name: "Archivar tipo de clase" }),
    );
    await user.click(
      within(
        await screen.findByRole("alertdialog", {
          name: "¿Archivar Reformer Pilates?",
        }),
      ).getByRole("button", { name: "Archivar" }),
    );
    expect(
      await within(panel).findByText(
        "No puedes archivarlo: un horario semanal vigente lo usa.",
      ),
    ).toBeInTheDocument();

    await user.clear(within(panel).getByLabelText("Capacidad"));
    await user.type(within(panel).getByLabelText("Capacidad"), "8");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(body).toEqual({
        name: "Reformer Pilates",
        description: "Trabajo de fuerza y control en la máquina.",
        durationMinutes: 50,
        defaultCapacity: 8,
        equipmentNeeds: "Reformer",
      }),
    );
  });
});

describe("AW06 Tipos de clase on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers()));

  it("opens the Class Type form as a full-screen sheet", async () => {
    server.use(classTypeTable(() => jsonResponse(page([reformer]))));
    const { user } = renderAdmin("/catalogo/tipos-de-clase");
    await user.click(
      await screen.findByRole("button", { name: "Reformer Pilates" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "Editar tipo de clase" }),
    ).toHaveAttribute("data-presentation", "full-screen");
  });
});
