import {
  getListAdminBranchesQueryKey,
  getListStaffMembersQueryKey,
} from "@pilates/api-contracts";
import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { centro, norte } from "../../test/booking-handlers";
import {
  apiUrl,
  jsonResponse,
  problemResponse,
  server,
  useMockServer,
} from "../../test/msw";
import {
  allBranchesHandler,
  emma,
  staffMembersPath,
  staffPage,
  valentina,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { useNarrowViewport } from "../../test/viewport";

const created: unknown[] = [];
const staffHandlers = (respond: () => Response) => [
  http.get(apiUrl(staffMembersPath), () =>
    jsonResponse(staffPage(created.length > 0 ? [emma, valentina] : [emma])),
  ),
  http.post(apiUrl(staffMembersPath), async ({ request }) => {
    created.push(await request.json());
    return respond();
  }),
];

const openCreate = async () => {
  const rendered = renderAdmin("/back-office/personal");
  await screen.findByRole("cell", { name: /Emma Vargas/ });
  await rendered.user.click(
    screen.getByRole("button", { name: "Nuevo miembro" }),
  );
  return {
    ...rendered,
    panel: await screen.findByRole("dialog", { name: "Nuevo miembro" }),
  };
};

const trainersKey = getListStaffMembersQueryKey({
  role: "trainer",
  branchId: centro.id,
  pageSize: 100,
});

describe("AW24 Nuevo miembro on a desktop browser", () => {
  useMockServer();
  beforeEach(() => {
    created.length = 0;
    server.use(...signedInHandlers(), allBranchesHandler());
  });

  it("validates every field and explains the activation email instead of a password", async () => {
    server.use(...staffHandlers(() => jsonResponse(valentina, 201)));
    const { panel, user } = await openCreate();

    expect(panel).toHaveAttribute("data-presentation", "side-panel");
    expect(
      within(panel).getByText(
        "Le enviaremos un enlace de activación a este correo. Vence en 7 días.",
      ),
    ).toBeInTheDocument();
    expect(within(panel).queryByText(/Contraseña/)).not.toBeInTheDocument();
    const roles = within(panel).getByRole("group", { name: "Rol" });
    expect(
      within(roles)
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("value")),
    ).toEqual(["trainer", "assistant", "administrator", "nutritionist"]);
    expect(within(roles).queryByRole("radio", { checked: true })).toBeNull();

    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(await within(panel).findByText("Escribe el nombre.")).toBeVisible();
    expect(within(panel).getByText("Escribe un correo válido.")).toBeVisible();
    expect(within(panel).getByText("Elige un rol.")).toBeVisible();

    await user.click(within(roles).getByRole("radio", { name: "Entrenadora" }));
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));
    expect(
      await within(panel).findByText("Elige al menos una sucursal."),
    ).toBeVisible();
    expect(created).toEqual([]);
  });

  it("replaces the Branch choice with a read-only row for an Administrator", async () => {
    server.use(...staffHandlers(() => jsonResponse(valentina, 201)));
    const { panel, user } = await openCreate();
    const branches = within(panel).getByRole("group", {
      name: "Sucursales asignadas",
    });
    expect(
      within(branches)
        .getAllByRole("checkbox")
        .map((box) => box.getAttribute("name")),
    ).toHaveLength(3);

    await user.click(
      within(panel).getByRole("radio", { name: "Administración" }),
    );

    expect(
      within(panel).queryByRole("group", { name: "Sucursales asignadas" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).getByText("Todas las sucursales (implícito por el rol)"),
    ).toBeVisible();
  });

  it("creates a pending Staff Member, says the invitation went out, and refreshes every staff list", async () => {
    server.use(...staffHandlers(() => jsonResponse(valentina, 201)));
    const { panel, user, queryClient } = await openCreate();
    queryClient.setQueryData(trainersKey, []);
    const branchesKey = getListAdminBranchesQueryKey({
      status: "active",
      pageSize: 100,
    });

    await user.type(
      within(panel).getByLabelText("Nombre"),
      " Valentina Soria ",
    );
    await user.type(
      within(panel).getByLabelText("Correo electrónico"),
      "valentina@emmapilates.bo",
    );
    await user.click(
      within(panel).getByRole("radio", { name: "Nutricionista" }),
    );
    await user.click(within(panel).getByRole("checkbox", { name: "Centro" }));
    await user.click(within(panel).getByRole("checkbox", { name: "Norte" }));
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Nuevo miembro" }),
      ).not.toBeInTheDocument(),
    );
    expect(created).toEqual([
      {
        name: "Valentina Soria",
        email: "valentina@emmapilates.bo",
        phone: null,
        role: "nutritionist",
        branchIds: [centro.id, norte.id],
      },
    ]);
    expect(
      await screen.findByText(
        "Invitación enviada a valentina@emmapilates.bo: tiene 7 días para activar su cuenta.",
      ),
    ).toBeVisible();
    expect(
      await screen.findByRole("cell", { name: /Valentina Soria/ }),
    ).toBeVisible();
    expect(queryClient.getQueryState(trainersKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(branchesKey)?.isInvalidated).toBe(false);
  });

  it("creates an Administrator without Branches and keeps an optional phone", async () => {
    server.use(...staffHandlers(() => jsonResponse(valentina, 201)));
    const { panel, user } = await openCreate();

    await user.type(within(panel).getByLabelText("Nombre"), "Sara Paz");
    await user.type(
      within(panel).getByLabelText("Correo electrónico"),
      "sara@emmapilates.bo",
    );
    await user.type(
      within(panel).getByLabelText("Teléfono (opcional)"),
      "+591 70000000",
    );
    await user.click(
      within(panel).getByRole("radio", { name: "Administración" }),
    );
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(created).toEqual([
        {
          name: "Sara Paz",
          email: "sara@emmapilates.bo",
          phone: "+591 70000000",
          role: "administrator",
          branchIds: [],
        },
      ]),
    );
  });

  it("marks an email already in use on its field and keeps what was typed", async () => {
    server.use(...staffHandlers(() => problemResponse(409, "email_in_use")));
    const { panel, user } = await openCreate();

    await user.type(within(panel).getByLabelText("Nombre"), "Emma Duplicada");
    await user.type(
      within(panel).getByLabelText("Correo electrónico"),
      "emma@emmapilates.bo",
    );
    await user.click(within(panel).getByRole("radio", { name: "Asistente" }));
    await user.click(within(panel).getByRole("checkbox", { name: "Centro" }));
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await within(panel).findByText("Este correo ya pertenece a otra cuenta."),
    ).toBeVisible();
    expect(within(panel).getByLabelText("Correo electrónico")).toHaveValue(
      "emma@emmapilates.bo",
    );
    expect(within(panel).getByLabelText("Nombre")).toHaveValue(
      "Emma Duplicada",
    );
  });

  it("says when the recipient already got an email a moment ago", async () => {
    server.use(...staffHandlers(() => problemResponse(429, "email_throttled")));
    const { panel, user } = await openCreate();

    await user.type(within(panel).getByLabelText("Nombre"), "Sara Paz");
    await user.type(
      within(panel).getByLabelText("Correo electrónico"),
      "sara@emmapilates.bo",
    );
    await user.click(
      within(panel).getByRole("radio", { name: "Administración" }),
    );
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await within(panel).findByText(
        "Ya enviamos un correo a esa dirección hace poco. Inténtalo de nuevo en un momento.",
      ),
    ).toBeVisible();
  });
});

describe("AW24 Nuevo miembro on a narrow browser", () => {
  useMockServer();
  useNarrowViewport();
  beforeEach(() => server.use(...signedInHandlers(), allBranchesHandler()));

  it("opens the form as a full-screen sheet", async () => {
    server.use(...staffHandlers(() => jsonResponse(valentina, 201)));
    const { panel } = await openCreate();

    expect(panel).toHaveAttribute("data-presentation", "full-screen");
    expect(within(panel).getByRole("group", { name: "Rol" })).toBeVisible();
  });
});
