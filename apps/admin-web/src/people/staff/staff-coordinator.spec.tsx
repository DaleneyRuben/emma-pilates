import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, jsonResponse, server, useMockServer } from "../../test/msw";
import {
  allBranchesHandler,
  emma,
  member,
  staffMembersPath,
  staffPage,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import {
  coordinatorHandlers,
  signedInHandlers,
} from "../../test/session-handlers";

// IDN-009 (follow-up 157): the Administrator invites the Coordinator from
// Personal; the Coordinator reads Personal without changing it (ADR-0102).
const carolina = member("06", "Carolina Rivas", {
  role: "coordinator",
  branchIds: [],
});
const created: unknown[] = [];
const staffHandlers = () => [
  http.get(apiUrl(staffMembersPath), () =>
    jsonResponse(staffPage([emma, carolina])),
  ),
  http.post(apiUrl(staffMembersPath), async ({ request }) => {
    created.push(await request.json());
    return jsonResponse({ ...carolina, status: "pending" }, 201);
  }),
];

describe("the Coordinator Role in Personal", () => {
  useMockServer();
  beforeEach(() => {
    created.length = 0;
  });

  it("lets the Administrator invite a Coordinator, who holds every Branch", async () => {
    server.use(...signedInHandlers(), allBranchesHandler(), ...staffHandlers());
    const { user } = renderAdmin("/back-office/personal");

    const row = await screen.findByRole("row", { name: /Carolina Rivas/ });
    expect(within(row).getByText("Coordinador")).toBeInTheDocument();
    expect(within(row).getByText("Todas")).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Coordinador" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nuevo miembro" }));
    const panel = await screen.findByRole("dialog", { name: "Nuevo miembro" });
    await user.type(within(panel).getByLabelText("Nombre"), "Carolina Rivas");
    await user.type(
      within(panel).getByLabelText("Correo electrónico"),
      "carolina.rivas@example.com",
    );
    const roles = within(panel).getByRole("group", { name: "Rol" });
    await user.click(within(roles).getByRole("radio", { name: "Coordinador" }));
    expect(
      within(panel).getByText("Todas las sucursales (implícito por el rol)"),
    ).toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await screen.findByText(/Invitación enviada/);
    expect(created).toEqual([
      expect.objectContaining({ role: "coordinator", branchIds: [] }),
    ]);
  });

  it("shows the Coordinator Personal read-only", async () => {
    server.use(
      ...coordinatorHandlers(),
      allBranchesHandler(),
      ...staffHandlers(),
    );
    const { user } = renderAdmin("/back-office/personal");

    await user.click(
      await screen.findByRole("button", { name: "Emma Vargas" }),
    );
    const panel = await screen.findByRole("dialog", { name: "Editar miembro" });
    expect(
      screen.queryByRole("button", { name: "Nuevo miembro" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Guardar" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).getByText("Solo administración invita y cambia roles."),
    ).toBeInTheDocument();
  });
});
