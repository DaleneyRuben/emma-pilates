import { screen, waitFor, within } from "@testing-library/react";
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
  referralCodeHandler,
  staffMembersPath,
  staffPage,
  valentina,
} from "../../test/people-fixtures";
import {
  memberPath,
  openMember,
  record,
  sent,
} from "../../test/staff-panel-support";
import { signedInHandlers } from "../../test/session-handlers";

const listOf = (...members: (typeof emma)[]) =>
  http.get(apiUrl(staffMembersPath), () =>
    jsonResponse(staffPage([...members, paolaMember])),
  );

const contactSaved = (body: Partial<typeof emma>, base = camila) =>
  http.put(
    apiUrl(`${memberPath(base.id)}/contact`),
    record(() => jsonResponse({ ...base, ...body })),
  );

// FIX-038, decision §20.21 (owner, 2026-11-05): the Administrator edits the
// name and phone of every other member, active or pending.
describe("AW24 Editar miembro contact", () => {
  useMockServer();
  beforeEach(() => {
    sent.length = 0;
    server.use(
      ...signedInHandlers(),
      allBranchesHandler(),
      referralCodeHandler(),
    );
  });

  it("gives an active member back her phone and corrects her name", async () => {
    server.use(
      listOf(camila),
      contactSaved({ name: "Camila Rojas Vaca", phone: "+591 70000001" }),
    );
    const { panel, user } = await openMember("Camila Rojas");

    const name = within(panel).getByLabelText("Nombre");
    const phone = within(panel).getByLabelText("Teléfono (opcional)");
    expect(name).toHaveValue("Camila Rojas");
    expect(phone).toHaveValue("");
    // The login email of an active account stays as it is here.
    expect(within(panel).getByText(camila.email)).toBeVisible();
    expect(
      within(panel).queryByRole("textbox", { name: /correo/i }),
    ).not.toBeInTheDocument();

    await user.clear(name);
    await user.type(name, "Camila Rojas Vaca");
    await user.type(phone, "70000001");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(sent).toEqual([
        {
          method: "PUT",
          path: `${memberPath(camila.id)}/contact`,
          body: { name: "Camila Rojas Vaca", phone: "+591 70000001" },
        },
      ]),
    );
    expect(
      await screen.findByText("Guardamos los cambios de Camila Rojas Vaca."),
    ).toBeVisible();
  });

  it("clears a phone", async () => {
    server.use(listOf(emma), contactSaved({ phone: null }, emma));
    const { panel, user } = await openMember("Emma Vargas");

    await user.clear(within(panel).getByLabelText("Teléfono (opcional)"));
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(sent).toEqual([
        {
          method: "PUT",
          path: `${memberPath(emma.id)}/contact`,
          body: { name: "Emma Vargas", phone: null },
        },
      ]),
    );
  });

  it("asks for a Bolivian mobile and a name before sending", async () => {
    server.use(listOf(camila));
    const { panel, user } = await openMember("Camila Rojas");

    await user.clear(within(panel).getByLabelText("Nombre"));
    await user.type(
      within(panel).getByLabelText("Teléfono (opcional)"),
      "12345",
    );
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(await within(panel).findByText("Escribe el nombre.")).toBeVisible();
    expect(
      within(panel).getByText(
        "Escribe un celular de Bolivia de 8 dígitos, por ejemplo 71234567.",
      ),
    ).toBeVisible();
    expect(sent).toEqual([]);
  });

  it("keeps a stored phone from before the rule when only the Role changes", async () => {
    const abroad = { ...emma, phone: "+54 9 11 5555 0000" };
    server.use(
      listOf(abroad),
      http.put(
        apiUrl(`${memberPath(emma.id)}/role`),
        record(() => jsonResponse({ ...abroad, role: "administrator" })),
      ),
    );
    const { panel, user } = await openMember("Emma Vargas");

    expect(within(panel).getByLabelText("Teléfono (opcional)")).toHaveValue(
      "+54 9 11 5555 0000",
    );
    await user.click(
      within(panel).getByRole("radio", { name: "Administración" }),
    );
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

  it("never rewrites a stored phone that only looks like the rule", async () => {
    const unnormalized = { ...emma, phone: "77712345" };
    server.use(
      listOf(unnormalized),
      http.put(
        apiUrl(`${memberPath(emma.id)}/role`),
        record(() => jsonResponse({ ...unnormalized, role: "administrator" })),
      ),
    );
    const { panel, user } = await openMember("Emma Vargas");

    await user.click(
      within(panel).getByRole("radio", { name: "Administración" }),
    );
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

  it("says the contact was saved when the Role change after it fails", async () => {
    server.use(
      listOf(emma),
      contactSaved({ name: "Emma Vargas Paz" }, emma),
      http.put(
        apiUrl(`${memberPath(emma.id)}/role`),
        record(() => problemResponse(409, "trainer_has_upcoming_sessions")),
      ),
    );
    const { panel, user } = await openMember("Emma Vargas");

    const name = within(panel).getByLabelText("Nombre");
    await user.clear(name);
    await user.type(name, "Emma Vargas Paz");
    await user.click(within(panel).getByRole("radio", { name: "Asistente" }));
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    expect(
      await within(panel).findByText(
        /^Guardamos el nombre y el teléfono, pero no el resto\./,
      ),
    ).toBeVisible();
    expect(sent.map(({ path }) => path)).toEqual([
      `${memberPath(emma.id)}/contact`,
      `${memberPath(emma.id)}/role`,
    ]);
  });

  it("corrects a pending member's name around the invitation card", async () => {
    server.use(
      listOf(valentina),
      contactSaved({ name: "Valentina Soria Paz" }, valentina),
    );
    const { panel, user } = await openMember("Valentina Soria");

    const name = within(panel).getByLabelText("Nombre");
    await user.clear(name);
    await user.type(name, "Valentina Soria Paz");
    await user.click(within(panel).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(sent).toEqual([
        {
          method: "PUT",
          path: `${memberPath(valentina.id)}/contact`,
          body: { name: "Valentina Soria Paz", phone: "+591 70822001" },
        },
      ]),
    );
  });
});
