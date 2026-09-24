import { getListStaffMembersQueryKey } from "@pilates/api-contracts";
import { screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { centro, equipetrol } from "../../test/booking-handlers";
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
  paolaMember,
  rita,
  staffMembersPath,
  staffPage,
  valentina,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";

const sent: { method: string; path: string; body: unknown }[] = [];
const memberPath = (id: string) => `${staffMembersPath}/${id}`;
const record =
  (respond: () => Response) =>
  async ({ request }: { request: Request }) => {
    const text = await request.text();
    sent.push({
      method: request.method,
      path: new URL(request.url).pathname,
      body: text === "" ? null : (JSON.parse(text) as unknown),
    });
    return respond();
  };

const list = () =>
  http.get(apiUrl(staffMembersPath), () =>
    jsonResponse(staffPage([emma, paolaMember, rita, valentina])),
  );

const openMember = async (name: string) => {
  const rendered = renderAdmin("/back-office/personal");
  await rendered.user.click(await screen.findByRole("button", { name }));
  return {
    ...rendered,
    panel: await screen.findByRole("dialog", { name: "Editar miembro" }),
  };
};

const trainersKey = getListStaffMembersQueryKey({
  role: "trainer",
  branchId: centro.id,
  pageSize: 100,
});

describe("AW24 Editar miembro", () => {
  useMockServer();
  beforeEach(() => {
    sent.length = 0;
    server.use(...signedInHandlers(), allBranchesHandler());
  });

  it("shows the contact read-only and removes a Branch after warning about assigned Sessions", async () => {
    server.use(
      list(),
      http.put(
        apiUrl(`${memberPath(emma.id)}/branches`),
        record(() => jsonResponse({ ...emma, branchIds: [centro.id] })),
      ),
    );
    const { panel, user, queryClient } = await openMember("Emma Vargas");
    queryClient.setQueryData(trainersKey, []);

    expect(within(panel).queryByLabelText("Nombre")).not.toBeInTheDocument();
    expect(within(panel).getByText("emma@emmapilates.bo")).toBeVisible();
    expect(
      within(panel).getByRole("radio", { name: "Entrenador" }),
    ).toBeChecked();
    expect(
      within(panel).getByRole("checkbox", { name: "Centro" }),
    ).toBeChecked();
    expect(
      within(panel).getByText(
        "Si sacas una sucursal, sus sesiones ya asignadas no se reasignan solas. Cámbialas de entrenadora en Horario antes de guardar.",
      ),
    ).toBeVisible();

    await user.click(
      within(panel).getByRole("checkbox", { name: "Equipetrol" }),
    );
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Editar miembro" }),
      ).not.toBeInTheDocument(),
    );
    expect(sent).toEqual([
      {
        method: "PUT",
        path: `${memberPath(emma.id)}/branches`,
        body: { branchIds: [centro.id] },
      },
    ]);
    expect(
      await screen.findByText("Guardamos los cambios de Emma Vargas."),
    ).toBeVisible();
    expect(queryClient.getQueryState(trainersKey)?.isInvalidated).toBe(true);
  });

  it("drops a Branch the chips cannot show (archived since) and saves the visible choice", async () => {
    // Urubó was archived after Emma was assigned there; the selector and the
    // chips list active Branches only, and the backend refuses the stale id.
    const archived = "0b6f6f2e-1d38-5a52-9d44-7a0cf0a1c004";
    const emmaAtUrubo = { ...emma, branchIds: [centro.id, archived] };
    server.use(
      http.get(apiUrl(staffMembersPath), () =>
        jsonResponse(staffPage([emmaAtUrubo, paolaMember])),
      ),
      http.put(
        apiUrl(`${memberPath(emma.id)}/branches`),
        record(() => jsonResponse({ ...emma, branchIds: [centro.id] })),
      ),
    );
    const { panel, user } = await openMember("Emma Vargas");
    expect(
      within(panel).getByRole("checkbox", { name: "Centro" }),
    ).toBeChecked();

    await user.click(
      within(panel).getByRole("checkbox", { name: "Equipetrol" }),
    );
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(sent).toEqual([
        {
          method: "PUT",
          path: `${memberPath(emma.id)}/branches`,
          body: { branchIds: [centro.id, equipetrol.id] },
        },
      ]),
    );
  });

  it("explains why a Trainer with upcoming Sessions keeps the Branch", async () => {
    server.use(
      list(),
      http.put(
        apiUrl(`${memberPath(emma.id)}/branches`),
        record(() => problemResponse(409, "trainer_has_upcoming_sessions")),
      ),
    );
    const { panel, user } = await openMember("Emma Vargas");

    await user.click(
      within(panel).getByRole("checkbox", { name: "Equipetrol" }),
    );
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await within(panel).findByText(/Cámbiale la entrenadora desde Horario/),
    ).toBeVisible();
    expect(
      within(panel).getByRole("checkbox", { name: "Equipetrol" }),
    ).not.toBeChecked();
  });

  it("changes the Role with the Branches in one command, and none for an Administrator", async () => {
    server.use(
      list(),
      http.put(
        apiUrl(`${memberPath(emma.id)}/role`),
        record(() => jsonResponse({ ...emma, role: "administrator" })),
      ),
    );
    const { panel, user } = await openMember("Emma Vargas");

    await user.click(
      within(panel).getByRole("radio", { name: "Administrador" }),
    );
    expect(
      within(panel).getByText("Todas las sucursales (implícito por el rol)"),
    ).toBeVisible();
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(sent).toEqual([
        {
          method: "PUT",
          path: `${memberPath(emma.id)}/role`,
          body: { role: "administrator" },
        },
      ]),
    );
  });

  it("closes without a request when nothing changed", async () => {
    server.use(list());
    const { panel, user } = await openMember("Emma Vargas");

    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Editar miembro" }),
      ).not.toBeInTheDocument(),
    );
    expect(sent).toEqual([]);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("resends the Activation Link of a pending member and says when it is too soon", async () => {
    let resends = 0;
    server.use(
      list(),
      http.post(
        apiUrl(`${memberPath(valentina.id)}/activation-link`),
        record(() => {
          resends += 1;
          return resends === 1
            ? jsonResponse({
                ...valentina,
                activationExpiresAt: "2026-10-02T15:00:00.000Z",
              })
            : problemResponse(429, "email_throttled");
        }),
      ),
    );
    const { panel, user } = await openMember("Valentina Soria");

    expect(within(panel).getByText("Pendiente de activación")).toBeVisible();
    expect(
      within(panel).getByText("El enlace vence el 30/09/2026."),
    ).toBeVisible();
    expect(
      within(panel).getByText(
        "Si no activa su cuenta en 30 días desde el último envío, la invitación se elimina.",
      ),
    ).toBeVisible();

    await user.click(
      within(panel).getByRole("button", { name: "Reenviar enlace" }),
    );
    expect(
      await within(panel).findByText(
        "Enviamos un enlace nuevo a valentina@emmapilates.bo.",
      ),
    ).toBeVisible();
    expect(
      within(panel).getByText("El enlace vence el 02/10/2026."),
    ).toBeVisible();

    await user.click(
      within(panel).getByRole("button", { name: "Reenviar enlace" }),
    );
    expect(
      await within(panel).findByText(
        "Ya enviamos un correo a esa dirección hace poco. Inténtalo de nuevo en un momento.",
      ),
    ).toBeVisible();
    expect(resends).toBe(2);
  });

  it("deactivates a member only after confirming and explains a refusal", async () => {
    let attempts = 0;
    server.use(
      list(),
      http.post(
        apiUrl(`${memberPath(emma.id)}/deactivation`),
        record(() => {
          attempts += 1;
          return attempts === 1
            ? problemResponse(409, "trainer_has_upcoming_sessions")
            : jsonResponse({ ...emma, status: "deactivated" });
        }),
      ),
    );
    const { panel, user } = await openMember("Emma Vargas");

    await user.click(
      within(panel).getByRole("button", { name: "Desactivar cuenta" }),
    );
    const confirm = await screen.findByRole("alertdialog", {
      name: "¿Desactivar a Emma Vargas?",
    });
    expect(
      within(confirm).getByText(
        "Cerramos todas sus sesiones y ya no podrá entrar. Su historial se conserva.",
      ),
    ).toBeVisible();
    await user.click(
      within(confirm).getByRole("button", { name: "Desactivar" }),
    );
    expect(
      await within(panel).findByText(/Cámbiale la entrenadora desde Horario/),
    ).toBeVisible();

    await user.click(
      within(panel).getByRole("button", { name: "Desactivar cuenta" }),
    );
    await user.click(
      within(
        await screen.findByRole("alertdialog", {
          name: "¿Desactivar a Emma Vargas?",
        }),
      ).getByRole("button", { name: "Desactivar" }),
    );
    expect(
      await screen.findByText(
        "Emma Vargas ya no tiene acceso: cerramos todas sus sesiones.",
      ),
    ).toBeVisible();
    expect(attempts).toBe(2);
  });

  it("keeps the signed-in Administrator's own account read-only", async () => {
    server.use(list());
    const { panel } = await openMember("Paola Mendoza");

    expect(
      within(panel).getByText(
        "Es tu cuenta: no puedes cambiar tu rol ni desactivarla desde aquí.",
      ),
    ).toBeVisible();
    expect(within(panel).queryByRole("radio")).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Guardar" }),
    ).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Desactivar cuenta" }),
    ).not.toBeInTheDocument();
  });

  it("keeps a deactivated member read-only", async () => {
    server.use(list());
    const { panel } = await openMember("Rita Salas");

    expect(
      within(panel).getByText(
        "Esta cuenta está desactivada: ya no puede entrar.",
      ),
    ).toBeVisible();
    expect(within(panel).getByText("Entrenador")).toBeVisible();
    expect(within(panel).getByText("Centro")).toBeVisible();
    expect(
      within(panel).queryByRole("button", { name: "Guardar" }),
    ).not.toBeInTheDocument();
  });
});
