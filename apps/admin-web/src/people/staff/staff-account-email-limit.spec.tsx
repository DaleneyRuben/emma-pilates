import { screen, within } from "@testing-library/react";
import { http } from "msw";
import { apiUrl, problemResponse, server, useMockServer } from "../../test/msw";
import {
  allBranchesHandler,
  emma,
  staffMembersPath,
  staffPage,
  valentina,
} from "../../test/people-fixtures";
import { renderAdmin } from "../../test/render-admin";
import { signedInHandlers } from "../../test/session-handlers";
import { list, memberPath, openMember } from "../../test/staff-panel-support";

const accountLimit =
  "Enviaste muchos correos en poco tiempo. Espera un momento para enviar otro; los enlaces que ya enviaste siguen sirviendo.";

const accountLimited = () =>
  problemResponse(429, "staff_email_throttled", {
    headers: { "Retry-After": "892" },
  });

// BE-013, follow-up 78: the Administrator's own email budget is full.
describe("AW24 under the Administrator's email limit", () => {
  useMockServer();
  beforeEach(() => server.use(...signedInHandlers(), allBranchesHandler()));

  it("shows the Account limit on a pending member's resend", async () => {
    server.use(
      list(),
      http.post(
        apiUrl(`${memberPath(valentina.id)}/activation-link`),
        accountLimited,
      ),
    );
    const { panel, user } = await openMember("Valentina Soria");

    await user.click(
      within(panel).getByRole("button", { name: "Reenviar enlace" }),
    );

    const notice = await within(panel).findByRole("status", {
      name: undefined,
    });
    expect(notice).toHaveTextContent(accountLimit);
    expect(notice).toHaveTextContent("Podrás enviarlo en 14:52.");
    expect(
      within(panel).getByRole("button", { name: "Reenviar enlace" }),
    ).toBeDisabled();
    expect(
      within(panel).queryByText(
        "Ya enviamos un correo a esa dirección hace poco. El enlace vigente sigue sirviendo.",
      ),
    ).toBeNull();
  });

  it("keeps «Guardar correo» disabled while the Administrator waits", async () => {
    server.use(
      list(),
      http.post(
        apiUrl(`${memberPath(valentina.id)}/email-corrections`),
        accountLimited,
      ),
    );
    const { panel, user } = await openMember("Valentina Soria");

    await user.click(
      within(panel).getByRole("button", { name: "Cambiar correo" }),
    );
    const field = within(panel).getByLabelText("Nuevo correo");
    await user.clear(field);
    await user.type(field, "valentina.soria@emmapilates.bo");
    await user.click(
      within(panel).getByRole("button", { name: "Guardar correo" }),
    );

    expect(await within(panel).findByText(accountLimit)).toBeVisible();
    expect(
      within(panel).getByRole("button", { name: "Guardar correo" }),
    ).toBeDisabled();
  });

  it("keeps the new member form and disables «Guardar» until the wait ends", async () => {
    server.use(
      http.get(apiUrl(staffMembersPath), () =>
        Response.json(staffPage([emma])),
      ),
      http.post(apiUrl(staffMembersPath), accountLimited),
    );
    const { user } = renderAdmin("/back-office/personal");
    await user.click(
      await screen.findByRole("button", { name: "Nuevo miembro" }),
    );
    const panel = await screen.findByRole("dialog", { name: "Nuevo miembro" });
    await user.type(within(panel).getByLabelText("Nombre"), "Sara Paz");
    await user.type(
      within(panel).getByLabelText("Correo electrónico"),
      "sara@emmapilates.bo",
    );
    await user.click(
      within(panel).getByRole("radio", { name: "Administración" }),
    );
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(await within(panel).findByText(accountLimit)).toBeVisible();
    expect(
      within(panel).getByText("Podrás intentarlo en 14:52."),
    ).toBeVisible();
    expect(
      within(panel).getByRole("button", { name: "Guardar" }),
    ).toBeDisabled();
    expect(within(panel).getByLabelText("Correo electrónico")).toHaveValue(
      "sara@emmapilates.bo",
    );
    expect(
      within(panel).queryByText("No pudimos guardar. Inténtalo de nuevo."),
    ).toBeNull();
  });
});
