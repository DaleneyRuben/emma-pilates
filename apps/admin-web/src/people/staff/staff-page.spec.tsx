import { screen, within } from "@testing-library/react";
import { http } from "msw";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import {
  allBranchesHandler,
  camila,
  emma,
  paolaMember,
  rita,
  staffMembersPath,
  staffPage,
  valentina,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";

const reads: URLSearchParams[] = [];
const staffTable = (respond: (params: URLSearchParams) => Response) =>
  http.get(apiUrl(staffMembersPath), ({ request }) => {
    const params = new URL(request.url).searchParams;
    reads.push(params);
    return respond(params);
  });

const rowOf = async (name: string) =>
  (await screen.findByRole("cell", { name: new RegExp(name) }))
    .parentElement as HTMLElement;

describe("AW23 Personal on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    reads.length = 0;
    server.use(...signedInHandlers(), allBranchesHandler());
  });

  it("lists Staff Members with a neutral Role label, their Branches, and activation status", async () => {
    server.use(
      staffTable(() =>
        jsonResponse(staffPage([camila, emma, paolaMember, rita, valentina])),
      ),
    );
    renderAdmin("/back-office/personal");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Personal" }),
    ).toBeVisible();
    expect(screen.getByText("Cargando al personal…")).toBeInTheDocument();

    const emmaRow = await rowOf("Emma Vargas");
    const role = within(emmaRow).getByRole("cell", { name: "Entrenador" });
    expect(role).toHaveAttribute("data-label", "Rol");
    expect(role.querySelector("[aria-hidden='true']")).toBeNull();
    expect(
      within(emmaRow).getByRole("cell", { name: "Centro, Equipetrol" }),
    ).toHaveAttribute("data-label", "Sucursales");
    expect(within(emmaRow).getByText("Activo")).toBeInTheDocument();
    expect(
      within(emmaRow).getByRole("cell", { name: /emma@emmapilates.bo/ }),
    ).toHaveAttribute("data-label", "Contacto");

    const paolaRow = await rowOf("Paola Mendoza");
    expect(
      within(paolaRow).getByRole("cell", { name: "Administrador" }),
    ).toBeInTheDocument();
    expect(
      within(paolaRow).getByRole("cell", { name: "Todas" }),
    ).toBeInTheDocument();
    expect(
      within(await rowOf("Valentina Soria")).getByText("Pendiente"),
    ).toBeInTheDocument();
    expect(
      within(await rowOf("Rita Salas")).getByText("Desactivado"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nuevo miembro" })).toBeEnabled();
    expect(screen.getByText("Mostrando 1–5 de 5 miembros")).toBeVisible();
    expect(reads[0]?.has("role")).toBe(false);
  });

  it("filters by one Role at a time and keeps it in the address", async () => {
    server.use(
      staffTable((params) =>
        jsonResponse(
          staffPage(params.get("role") === "assistant" ? [camila] : [emma]),
        ),
      ),
    );
    const { router, user } = renderAdmin("/back-office/personal?page=2");
    await rowOf("Emma Vargas");
    const filter = screen.getByLabelText("Rol");
    expect(filter).toHaveValue("all");
    expect(
      within(filter)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([
      "Todos",
      "Entrenador",
      "Asistente",
      "Administrador",
      "Nutricionista",
      "Coordinador",
    ]);

    await user.selectOptions(filter, "assistant");

    expect(await rowOf("Camila Rojas")).toBeVisible();
    expect(reads.at(-1)?.get("role")).toBe("assistant");
    expect(router.state.matches.at(-1)?.search).toEqual({
      page: 1,
      pageSize: 20,
      role: "assistant",
    });
  });

  it("says when no Staff Member has the Role and when the table cannot load", async () => {
    server.use(staffTable(() => jsonResponse(staffPage([]))));
    const { user } = renderAdmin("/back-office/personal?role=nutritionist");
    expect(
      await screen.findByText("No hay miembros con este rol."),
    ).toBeInTheDocument();

    server.use(staffTable(() => problemResponse(500, "unexpected_error")));
    await user.selectOptions(screen.getByLabelText("Rol"), "all");
    expect(
      await screen.findByText(
        "No pudimos cargar al personal.",
        {},
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
  });

  it("hides the create action from an Administrator who lost access", async () => {
    server.use(staffTable(() => problemResponse(403, "staff_access_denied")));
    renderAdmin("/back-office/personal");

    expect(
      await screen.findByText("No tienes permiso para ver esta sección."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Nuevo miembro" }),
    ).not.toBeInTheDocument();
  });
});

describe("AW23 Personal on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers(), allBranchesHandler()));

  it("shows one labelled card per Staff Member", async () => {
    server.use(staffTable(() => jsonResponse(staffPage([emma]))));
    renderAdmin("/back-office/personal");

    expect(
      await screen.findByRole("cell", { name: "Centro, Equipetrol" }),
    ).toHaveAttribute("data-label", "Sucursales");
    expect(screen.getByLabelText("Rol")).toBeVisible();
  });
});
