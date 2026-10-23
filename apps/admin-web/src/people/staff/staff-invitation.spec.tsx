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
  staffMembersPath,
  valentina,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import {
  list,
  memberPath,
  openMember,
  record,
  sent,
} from "../../test/staff-panel-support";

// WEB-012: AW24's pending invitation (follow-ups 35–36).
describe("AW24 pending invitation", () => {
  useMockServer();
  beforeEach(() => {
    sent.length = 0;
    server.use(...signedInHandlers(), allBranchesHandler());
  });

  it("changes the invitation's email and says the old links stop working", async () => {
    server.use(
      list(),
      http.post(
        apiUrl(`${memberPath(valentina.id)}/email-corrections`),
        record(() =>
          jsonResponse({
            ...valentina,
            email: "valentina.soria@emmapilates.bo",
          }),
        ),
      ),
    );
    const { panel, user } = await openMember("Valentina Soria");

    expect(
      within(panel).getByText(
        "Si no activa su cuenta en 30 días desde el último envío o cambio, la invitación se elimina. Es distinto de los 7 días de cada enlace.",
      ),
    ).toBeVisible();
    await user.click(
      within(panel).getByRole("button", { name: "Cambiar correo" }),
    );
    expect(
      within(panel).getByText(
        "Los enlaces enviados a valentina@emmapilates.bo dejarán de funcionar; enviaremos uno nuevo de 7 días.",
      ),
    ).toBeVisible();
    const field = within(panel).getByLabelText("Nuevo correo");
    await user.clear(field);
    await user.type(field, "valentina.soria@emmapilates.bo");
    await user.click(
      within(panel).getByRole("button", { name: "Guardar correo" }),
    );

    expect(
      await within(panel).findByText(
        "Enviamos un enlace nuevo a valentina.soria@emmapilates.bo.",
      ),
    ).toBeVisible();
    // AW24 shows a pending address only in the pending card (WEB-014).
    expect(
      within(panel).getByText("valentina.soria@emmapilates.bo"),
    ).toBeVisible();
    expect(within(panel).queryByText("valentina@emmapilates.bo")).toBeNull();
    expect(sent).toContainEqual({
      method: "POST",
      path: `${memberPath(valentina.id)}/email-corrections`,
      body: { email: "valentina.soria@emmapilates.bo" },
    });
  });

  it("asks before cancelling the invitation and closes the panel after", async () => {
    server.use(
      list(),
      http.post(
        apiUrl(`${memberPath(valentina.id)}/invitation-cancellation`),
        record(() => new Response(null, { status: 204 })),
      ),
    );
    const { panel, user } = await openMember("Valentina Soria");

    expect(
      within(panel).queryByRole("button", { name: "Desactivar cuenta" }),
    ).not.toBeInTheDocument();
    await user.click(
      within(panel).getByRole("button", { name: "Cancelar invitación" }),
    );
    const dialog = await screen.findByRole("alertdialog", {
      name: "¿Cancelar la invitación de Valentina Soria?",
    });
    expect(
      within(dialog).getByText(
        "Se anularán los enlaces enviados, se liberará el correo y el miembro pendiente dejará de aparecer en Personal. Esto no desactiva a nadie que ya haya activado su cuenta.",
      ),
    ).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: "Sí, cancelar invitación" }),
    );

    expect(
      await screen.findByText("Cancelamos la invitación de Valentina Soria."),
    ).toBeVisible();
    expect(sent.map(({ path }) => path)).toContain(
      `${memberPath(valentina.id)}/invitation-cancellation`,
    );
  });

  it("shows the server wait on a limited resend", async () => {
    server.use(
      list(),
      http.post(apiUrl(`${memberPath(valentina.id)}/activation-link`), () =>
        problemResponse(429, "email_throttled", {
          headers: { "Retry-After": "40" },
        }),
      ),
    );
    const { panel, user } = await openMember("Valentina Soria");

    await user.click(
      within(panel).getByRole("button", { name: "Reenviar enlace" }),
    );

    expect(
      await within(panel).findByText(
        "Ya enviamos un correo a esa dirección hace poco. El enlace vigente sigue sirviendo.",
      ),
    ).toBeVisible();
    expect(within(panel).getByText("Podrás reenviarlo en 0:40.")).toBeVisible();
  });
});

describe("AW24 Nuevo miembro with a known email", () => {
  useMockServer();
  beforeEach(() => {
    server.use(...signedInHandlers(), allBranchesHandler(), list());
  });

  const openCreate = async () => {
    const rendered = renderAdmin("/back-office/personal");
    await rendered.user.click(
      await screen.findByRole("button", { name: "Nuevo miembro" }),
    );
    const panel = await screen.findByRole("dialog", { name: "Nuevo miembro" });
    await rendered.user.type(
      within(panel).getByLabelText("Nombre"),
      "Valentina Soria",
    );
    await rendered.user.type(
      within(panel).getByLabelText("Correo electrónico"),
      "valentina@emmapilates.bo",
    );
    return { ...rendered, panel };
  };

  it("says a Client's email cannot be used", async () => {
    server.use(
      http.post(apiUrl(staffMembersPath), () =>
        problemResponse(409, "email_belongs_to_client"),
      ),
    );
    const { panel, user } = await openCreate();
    await user.click(
      within(within(panel).getByRole("group", { name: "Rol" })).getByRole(
        "radio",
        {
          name: "Administración",
        },
      ),
    );
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await within(panel).findByText(
        "Este correo pertenece a una cuenta de clienta. No se creó ni se cambió nada; usa otro correo.",
      ),
    ).toBeVisible();
  });

  it("says when the same email reopened a pending invitation", async () => {
    server.use(
      http.post(apiUrl(staffMembersPath), () =>
        jsonResponse({ ...valentina, invitationReopened: true }, 201),
      ),
    );
    const { panel, user } = await openCreate();
    await user.click(
      within(within(panel).getByRole("group", { name: "Rol" })).getByRole(
        "radio",
        {
          name: "Administración",
        },
      ),
    );
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await screen.findByText(
        "Valentina Soria ya tenía una invitación pendiente. La abrimos y enviamos un enlace nuevo; su rol y sus sucursales no cambiaron.",
      ),
    ).toBeVisible();
  });
});
